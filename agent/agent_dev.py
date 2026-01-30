import json
import re
from datetime import datetime
from typing import Any, Generator
from uuid import uuid4

import mlflow
from databricks_langchain import (
    ChatDatabricks,
    DatabricksFunctionClient,
    UCFunctionToolkit,
    set_uc_function_client,
)
from databricks_langchain.genie import GenieAgent
from langchain.agents import create_agent
from langchain.agents.middleware import TodoListMiddleware
from langchain.agents.middleware.summarization import SummarizationMiddleware
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent
from mlflow.pyfunc import ResponsesAgent
from mlflow.types.responses import (
    ResponsesAgentRequest,
    ResponsesAgentResponse,
    ResponsesAgentStreamEvent,
)
from pydantic import BaseModel

from deepagents.middleware.filesystem import FilesystemMiddleware, FilesystemState
from deepagents.middleware.patch_tool_calls import PatchToolCallsMiddleware

client = DatabricksFunctionClient()
set_uc_function_client(client)


########################################
# Formatting Helper Functions
########################################

def remove_file_references(content: str) -> str:
    """Remove references to virtual file operations from agent responses.

    Strips mentions of file operations (write_file, read_file, ls) that are
    implementation details not relevant to end users.
    """
    if not content:
        return content

    patterns = [
        r"I(?:'ve| have) saved.*?to [\w_\-\./]+\.\w+",
        r"I(?:'ll| will) save.*?to [\w_\-\./]+\.\w+",
        r"Let me save.*?to [\w_\-\./]+\.\w+",
        r"I(?:'ve| have) written.*?to [\w_\-\./]+\.\w+",
        r"Saved to [\w_\-\./]+\.\w+",
        r"Writing to [\w_\-\./]+\.\w+",
        r"I(?:'ll| will) write.*?to [\w_\-\./]+\.\w+",
        r"Saving.*?to [\w_\-\./]+\.\w+",
        r"Reading from [\w_\-\./]+\.\w+",
        r"I(?:'ve| have) read.*?from [\w_\-\./]+\.\w+",
        r"Let me read.*?from [\w_\-\./]+\.\w+",
        r"The file [\w_\-\./]+\.\w+ contains",
        r"From [\w_\-\./]+\.\w+:",
        r"I(?:'ve| have) saved.*?to /large_tool_results/[\w_\-\./]+",
        r"The (?:full )?results? (?:were|was|has been) (?:automatically )?saved to /large_tool_results/[\w_\-\./]+",
    ]

    cleaned = content
    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)
    cleaned = cleaned.strip()

    return cleaned


def apply_format_template(content: str, state: dict) -> str:
    """Apply consistent formatting to final response."""
    return content.strip()


########################################
# Configuration Models
########################################

GENIE = "genie"


class ServedSubAgent(BaseModel):
    endpoint_name: str
    name: str
    task: str
    description: str


class Genie(BaseModel):
    space_id: str
    name: str
    task: str = GENIE
    description: str


class InCodeSubAgent(BaseModel):
    tools: list[str]
    name: str
    description: str


def stringify_content(state):
    msgs = state["messages"]
    if isinstance(msgs[-1].content, list):
        msgs[-1].content = json.dumps(msgs[-1].content, indent=4)
    return {"messages": msgs}


########################################
# Build Domain Tools (Genie + UC Functions)
########################################

def build_domain_tools(
    externally_served_agents: list[ServedSubAgent | Genie],
    in_code_agents: list[InCodeSubAgent],
) -> list:
    """Build the domain-specific tools (Genie, UC functions, served agents).

    These are the tools the agent uses for actual work. Planning tools
    (write_todos, read_todos) and filesystem tools (ls, read_file, write_file,
    edit_file, glob, grep) are provided by middleware — not assembled here.

    Returns:
        List of LangChain tool objects
    """
    domain_tools = []

    # UC function tools
    for agent_config in in_code_agents:
        uc_toolkit = UCFunctionToolkit(function_names=agent_config.tools)
        domain_tools.extend(uc_toolkit.tools)

    # Genie and served endpoint tools
    for agent_config in externally_served_agents:
        if isinstance(agent_config, Genie):
            genie_agent = GenieAgent(
                genie_space_id=agent_config.space_id,
                genie_agent_name=agent_config.name,
                description=agent_config.description,
            )

            @tool
            def genie_query_tool(question: str, _agent=genie_agent) -> str:
                """Query the Genie Space for data about Databricks consumption.

                Use this tool to get data from tables including:
                - Customer accounts and consumption metrics
                - DBU usage and costs
                - Use case details, timelines, and status
                - Databricks SKU information

                Genie can execute SQL queries based on natural language questions.
                You can call this tool multiple times with different questions.

                IMPORTANT: To prevent context overflow, use aggregations and limits:
                - Request aggregated/summarized data when possible (GROUP BY, SUM, AVG)
                - Add "LIMIT 50" or similar to avoid retrieving thousands of rows

                Args:
                    question: Natural language question about the data (include LIMIT clauses)

                Returns:
                    Data results and insights from Genie
                """
                result = _agent.invoke({"messages": [{"role": "user", "content": question}]})
                return result["messages"][-1].content

            genie_query_tool.name = agent_config.name.replace(" ", "_").replace("-", "_")
            domain_tools.append(genie_query_tool)

        else:
            model = ChatDatabricks(
                endpoint=agent_config.endpoint_name,
                use_responses_api="responses" in agent_config.task
            )
            model._stream = lambda x: model._stream(**x, stream=False)
            served_agent = create_react_agent(
                model,
                tools=[],
                name=agent_config.name,
                post_model_hook=stringify_content,
            )

            @tool
            def served_agent_tool(task: str, _agent=served_agent, _name=agent_config.name) -> str:
                f"""Delegate task to {_name}.

                {agent_config.description}

                Args:
                    task: The task or question to send to this agent

                Returns:
                    Response from the agent
                """
                result = _agent.invoke({"messages": [{"role": "user", "content": task}]})
                return result["messages"][-1].content

            served_agent_tool.name = agent_config.name.replace(" ", "_").replace("-", "_")
            domain_tools.append(served_agent_tool)

    return domain_tools


########################################
# System Prompt (domain-only, no tool instructions)
########################################

def build_system_prompt() -> str:
    """Build the system prompt with domain-specific instructions only.

    Tool usage instructions for planning (write_todos, read_todos) and
    filesystem (ls, read_file, write_file, etc.) are injected by their
    respective middleware — they should NOT be duplicated here.
    """
    current_date = datetime.now().strftime("%B %d, %Y")

    return f"""You are an AI assistant for analyzing Databricks consumption at various customers and creating reports.

CURRENT DATE: {current_date}
NOTE: Databricks fiscal year starts February 1st. Use fiscal quarters/years for all time-based queries (FY Q1=Feb-Apr, Q2=May-Jul, Q3=Aug-Oct, Q4=Nov-Jan) where needed.

KEY ANALYSIS GUIDELINES:
- Focus on DOLLARS as the primary metric (only analyze DBUs if explicitly requested)
- Use COMPLETED time periods by default (completed months, quarters, weeks) - exclude current/ongoing periods unless specifically asked to include them
- When working with Account Executives, call get_accounts_by_account_executive FIRST to identify which accounts you need to analyze

PLANNING AND EXECUTION:
For COMPLEX tasks (reports, multi-step analysis, questions requiring multiple data sources):
1. Use write_todos at the start to create a comprehensive plan with ALL anticipated steps
2. If querying by AE name, include a step to call get_accounts_by_account_executive to identify accounts
3. Execute each step by calling the appropriate tools
4. After completing each step, call write_todos to update the status of completed items
5. Use read_todos periodically to stay focused and see what's left
6. Synthesize comprehensive answer when all steps are complete

For SIMPLE tasks (single data query, straightforward question):
1. Call the appropriate tool directly
2. Return the result

QUERY OPTIMIZATION:
- When querying Genie, use aggregations (SUM, AVG, COUNT, GROUP BY) instead of raw data when possible
- Add LIMIT clauses (e.g., "LIMIT 50") to Genie queries to avoid retrieving thousands of rows

IMPORTANT GUIDELINES:
- You can call any tool multiple times with different inputs
- Break down complex questions into specific, answerable sub-questions
- For data queries, use the Genie tool which can execute SQL
- Always synthesize results into a clear, comprehensive answer
- Track your progress with TODOs to avoid losing focus
- DO NOT continuously revise your TODO plan - create it once, then execute
- When you have answered the question, STOP - do not look for additional work
- When using a UC tool, return the complete table output as returned by the tool itself."""


########################################
# Create Agent with Middleware
########################################

def create_langgraph_supervisor(
    llm: BaseChatModel,
    externally_served_agents: list[ServedSubAgent | Genie] = [],
    in_code_agents: list[InCodeSubAgent] = [],
) -> CompiledStateGraph:
    """Create a planning supervisor agent using langchain create_agent with middleware.

    Middleware provides (automatically, no prompt engineering needed):
    - TodoListMiddleware: write_todos, read_todos tools + planning system prompt
    - FilesystemMiddleware: ls, read_file, write_file, edit_file, glob, grep tools
      + auto-eviction of large tool results to /large_tool_results/
    - SummarizationMiddleware: token-aware context management, summarizes
      conversation when approaching context budget
    - PatchToolCallsMiddleware: handles dangling tool calls in message history

    Args:
        llm: Foundation model (ChatDatabricks instance)
        externally_served_agents: Genie spaces and served endpoints
        in_code_agents: UC function agents

    Returns:
        Compiled agent graph
    """
    domain_tools = build_domain_tools(externally_served_agents, in_code_agents)
    system_prompt = build_system_prompt()

    middleware = [
        TodoListMiddleware(),
        FilesystemMiddleware(
            # Auto-evict tool results larger than ~60K chars (15K tokens * 4 chars/token)
            # to /large_tool_results/ in the virtual filesystem.
            # This prevents Genie results from consuming the 128K context window.
            tool_token_limit_before_evict=15000,
        ),
        SummarizationMiddleware(
            model=llm,
            # Summarize conversation when it exceeds ~90K tokens (~70% of 128K).
            # Keeps 6 most recent messages after summarization.
            max_tokens_before_summary=90000,
            messages_to_keep=6,
        ),
        PatchToolCallsMiddleware(),
    ]

    agent = create_agent(
        model=llm,
        system_prompt=system_prompt,
        tools=domain_tools,
        middleware=middleware,
    )

    return agent


def create_supervisor_with_formatter(
    llm: BaseChatModel,
    externally_served_agents: list[ServedSubAgent | Genie] = [],
    in_code_agents: list[InCodeSubAgent] = [],
) -> CompiledStateGraph:
    """Create supervisor agent with post-processing formatter node.

    Wraps the base supervisor with a formatter that:
    1. Removes file operation references from responses
    2. Applies consistent formatting templates
    """
    supervisor = create_langgraph_supervisor(llm, externally_served_agents, in_code_agents)

    def format_final_response(state: dict) -> dict:
        """Reformat final AI message to remove file references and apply templates."""
        messages = state["messages"]

        last_ai_message = None
        for msg in reversed(messages):
            if msg.type == "ai":
                last_ai_message = msg
                break

        if last_ai_message and last_ai_message.content:
            content = last_ai_message.content
            content = remove_file_references(content)
            content = apply_format_template(content, state)
            last_ai_message.content = content

        return {"messages": messages}

    # Use FilesystemState so the outer graph propagates the 'files' channel
    # from the supervisor subgraph (needed for custom_outputs in predict()).
    workflow = StateGraph(FilesystemState)
    workflow.add_node("supervisor", supervisor)
    workflow.add_node("formatter", format_final_response)

    workflow.set_entry_point("supervisor")
    workflow.add_edge("supervisor", "formatter")
    workflow.add_edge("formatter", END)

    return workflow.compile()


##########################################
# Wrap as MLflow ResponsesAgent
##########################################

class LazyLangGraphResponsesAgent(ResponsesAgent):
    """MLflow ResponsesAgent wrapper with lazy initialization.

    Message sanitization, trimming, and truncation are handled by middleware:
    - PatchToolCallsMiddleware: fixes dangling tool calls
    - SummarizationMiddleware: token-aware context management
    - FilesystemMiddleware: auto-evicts large tool results
    """

    def __init__(self):
        self._agent = None
        self._final_state = None

    @property
    def agent(self):
        if self._agent is None:
            self._agent = get_supervisor()
        return self._agent

    def _langchain_to_responses(self, message: BaseMessage) -> list[dict[str, Any]]:
        """Convert LangChain message to Responses API output items."""
        message = message.model_dump()
        role = message["type"]
        output = []
        if role == "ai":
            if message.get("content"):
                output.append(
                    self.create_text_output_item(
                        text=message["content"],
                        id=message.get("id") or str(uuid4()),
                    )
                )
            if tool_calls := message.get("tool_calls"):
                output.extend(
                    [
                        self.create_function_call_item(
                            id=message.get("id") or str(uuid4()),
                            call_id=tool_call["id"],
                            name=tool_call["name"],
                            arguments=json.dumps(tool_call["args"]),
                        )
                        for tool_call in tool_calls
                    ]
                )
        elif role == "tool":
            output.append(
                self.create_function_call_output_item(
                    call_id=message["tool_call_id"],
                    output=message["content"],
                )
            )
        return output

    def predict(self, request: ResponsesAgentRequest) -> ResponsesAgentResponse:
        outputs = [
            event.item
            for event in self.predict_stream(request)
            if event.type == "response.output_item.done"
        ]

        files = {}
        if self._final_state:
            files = self._final_state.get("files", {})

        return ResponsesAgentResponse(
            output=outputs,
            custom_outputs={
                **(request.custom_inputs or {}),
                "files": files,
            }
        )

    def predict_stream(
        self,
        request: ResponsesAgentRequest,
    ) -> Generator[ResponsesAgentStreamEvent, None, None]:
        cc_msgs = self.prep_msgs_for_cc_llm([i.model_dump() for i in request.input])

        # Middleware handles sanitization, trimming, and truncation:
        # - PatchToolCallsMiddleware: fixes dangling tool calls
        # - SummarizationMiddleware: token-aware context management
        # - FilesystemMiddleware: auto-evicts large tool results

        first_name = True
        seen_ids = set()

        initial_state = {"messages": cc_msgs}
        config = {"recursion_limit": 100}

        for event_name, events in self.agent.stream(initial_state, config=config, stream_mode=["updates"]):
            if event_name == "updates":
                if not first_name:
                    node_name = tuple(events.keys())[0]
                    if node_name != "formatter":
                        yield ResponsesAgentStreamEvent(
                            type="response.output_item.done",
                            item=self.create_text_output_item(
                                text=f"<name>{node_name}</name>",
                                id=str(uuid4()),
                            ),
                        )
                for node_data in events.values():
                    self._final_state = node_data

                    for msg in node_data["messages"]:
                        if msg.id not in seen_ids:
                            seen_ids.add(msg.id)
                            for item in self._langchain_to_responses(msg):
                                yield ResponsesAgentStreamEvent(
                                    type="response.output_item.done", item=item
                                )
            first_name = False


#######################################################
# Configure the Foundation Model and Serving Sub-Agents
#######################################################

LLM_ENDPOINT_NAME = "databricks-gpt-oss-120b"
llm = ChatDatabricks(endpoint=LLM_ENDPOINT_NAME)

EXTERNALLY_SERVED_AGENTS = [
    Genie(
        space_id="01f0fd193cf412f7a40f97d24851c0d1",
        name="logfood-genie",
        description="This Genie agent can answer questions based on a database containing tables related to Databricks consumption at different customers, including accounts, dollars, dbus, the Databricks SKU along with Use Case details such as target live dates, use case descriptions and updates. Use Genie to fetch and analyze data from these tables by specifying the relevant columns and filters. Genie can execute SQL queries to provide precise data insights based on your questions.",
    ),
]

IN_CODE_AGENTS = [
    InCodeSubAgent(
        tools=["ankit_yadav.demo.get_accounts_by_account_executive"],
        name="account lookup",
        description="Returns selected account details managed by a specific Account Executive. Use this tool FIRST when working with AE names to identify which accounts you need to analyze before querying consumption data.",
    ),
    InCodeSubAgent(
        tools=["ankit_yadav.demo.get_account_summaries"],
        name="account summary",
        description="Generates AI-powered account-level summaries for all accounts managed by a specific Account Executive. Analyzes use case patterns, pipeline health, opportunities, and risks across all use cases per account. Use for comprehensive account overviews and strategic insights.",
    ),
    InCodeSubAgent(
        tools=["ankit_yadav.demo.get_live_date_follow_up_messages"],
        name="follow-up messages",
        description="Generates AI-powered follow-up messages for use cases targeting go-live in current or next month. Pass specific AE name, multiple names separated by comma, or NULL/'ALL' for all AEs. Creates concise Slack/Teams-ready messages for AE and SA based on next steps and use case details. Returns account, use case info, target live date, days until live, current stage, monthly dollars, and tailored follow-up message.",
    )
]

#################################################
# Build TOOLS list for resource registration
#################################################

# UC function tools (needed by resource setup cell for DatabricksFunction registration)
TOOLS = []
for _agent_cfg in IN_CODE_AGENTS:
    _uc_toolkit = UCFunctionToolkit(function_names=_agent_cfg.tools)
    TOOLS.extend(_uc_toolkit.tools)

#################################################
# Create supervisor and set up MLflow for tracing
#################################################

_supervisor = None

def get_supervisor():
    """Lazily create supervisor on first use to avoid model loading timeout."""
    global _supervisor
    if _supervisor is None:
        _supervisor = create_supervisor_with_formatter(llm, EXTERNALLY_SERVED_AGENTS, IN_CODE_AGENTS)
    return _supervisor


mlflow.langchain.autolog()
AGENT = LazyLangGraphResponsesAgent()
mlflow.models.set_model(AGENT)
