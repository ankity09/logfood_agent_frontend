/**
 * Meeting Notes Prompts
 *
 * Enhanced prompts for dual-stage meeting notes extraction
 */

/**
 * Stage 1: Structured meeting summary extraction
 */
export const STRUCTURED_SUMMARY_PROMPT = `You are an AI assistant that analyzes meeting notes and extracts structured information.

Analyze the meeting notes and extract the following structured information:

1. **Executive Summary** (2-3 sentences capturing the key purpose and outcome of the meeting)

2. **Key Topics** (Array of topics discussed)
   - topic: Brief topic name
   - details: Key points discussed
   - outcome: Any decisions or conclusions

3. **Decisions Made** (Array of specific decisions)
   - Clear, actionable decisions that were made during the meeting

4. **Action Items** (Array of tasks assigned)
   - action: What needs to be done
   - owner: Person responsible (or "Unassigned" if not specified)
   - dueDate: When it's due (or null if not specified)
   - priority: "high", "medium", or "low" based on context

5. **Risks and Concerns** (Array of identified risks)
   - risk: Description of the risk or concern
   - impact: Potential impact
   - mitigation: Any discussed mitigation (or null)

6. **Attendees** (Array of names)

7. **Account/Company** (Primary customer being discussed)

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "executive_summary": "string",
  "key_topics": [
    {
      "topic": "string",
      "details": "string",
      "outcome": "string or null"
    }
  ],
  "decisions": ["string"],
  "action_items": [
    {
      "action": "string",
      "owner": "string",
      "due_date": "string or null",
      "priority": "high|medium|low"
    }
  ],
  "risks_and_concerns": [
    {
      "risk": "string",
      "impact": "string",
      "mitigation": "string or null"
    }
  ],
  "attendees": ["string"],
  "account": "string or null"
}`

/**
 * Stage 2: Use case extraction with update detection
 *
 * @param {Object[]} existingUseCases - Array of existing use cases for matching
 */
export function getUseCaseExtractionPrompt(existingUseCases = []) {
  const existingList = existingUseCases.length > 0
    ? existingUseCases.map(uc => `- "${uc.title}" (ID: ${uc.id}, Stage: ${uc.stage})`).join('\n')
    : 'No existing use cases for this account.'

  return `You are an AI assistant that extracts Databricks use cases and opportunities from meeting notes.

## Context: Existing Use Cases
${existingList}

## Your Task
Analyze the meeting notes and identify:

1. **NEW Use Cases** - Completely new opportunities not matching any existing use case
2. **UPDATES to Existing Use Cases** - Information that updates or adds to an existing use case

## Extraction Types

For **NEW** use cases:
- extraction_type: "new"
- Provide full details: title, description, suggested_stage, next_steps
- suggested_stage should be one of: "validating", "scoping", "evaluating", "confirming", "onboarding", "live"

For **UPDATES** to existing use cases:
- extraction_type: "update"
- matched_use_case_id: ID of the existing use case this updates
- matched_use_case_title: Title of the matched use case
- extracted_updates: Array of specific updates/new information
- Do NOT repeat information already in the existing use case

## Confidence Scoring
Assign a confidence_score (0.0 to 1.0) based on:
- 0.9-1.0: Explicit mention with clear details
- 0.7-0.89: Clear mention but some details inferred
- 0.5-0.69: Implied or partially mentioned
- Below 0.5: Speculative - do not include

## Response Format
Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "use_cases": [
    {
      "extraction_type": "new",
      "title": "string",
      "description": "string",
      "suggested_stage": "string",
      "next_steps": ["string"],
      "confidence_score": 0.0
    },
    {
      "extraction_type": "update",
      "matched_use_case_id": "uuid",
      "matched_use_case_title": "string",
      "extracted_updates": ["string"],
      "confidence_score": 0.0
    }
  ]
}

Return an empty use_cases array if no clear use cases or updates are found.`
}

/**
 * Combined extraction prompt (for simpler single-stage extraction)
 */
export const COMBINED_EXTRACTION_PROMPT = `You are an AI assistant that analyzes meeting notes and extracts both structured information and Databricks use cases.

Analyze the meeting notes and extract:

1. **Meeting Summary**
   - summary: Brief 2-3 sentence summary
   - attendees: Array of attendee names
   - account: Primary account/company being discussed

2. **Use Cases** (Array of potential Databricks opportunities)
   For each use case:
   - title: Concise title
   - description: What the customer wants to achieve
   - stage: One of "validating", "scoping", "evaluating", "confirming", "onboarding", "live"
   - next_steps: Array of 2-4 actionable next steps
   - confidence_score: 0.0-1.0 based on how clearly it was discussed

IMPORTANT for account identification:
- Identify the PRIMARY account - the prospect or customer the meeting is about
- Do NOT use reference customers or case studies mentioned as examples
- If "exploring opportunities at Company X", Company X is the account
- If "Company Y" is mentioned as a "reference customer", Company Y is NOT the primary account

Respond ONLY with valid JSON:
{
  "summary": "string",
  "attendees": ["string"],
  "account": "string or null",
  "use_cases": [
    {
      "title": "string",
      "description": "string",
      "stage": "string",
      "next_steps": ["string"],
      "confidence_score": 0.0
    }
  ]
}`

/**
 * Helper to clean and parse JSON from AI response
 */
export function parseAIResponse(content) {
  let cleanContent = content.trim()

  // Remove markdown code blocks if present
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.slice(7)
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.slice(3)
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.slice(0, -3)
  }

  cleanContent = cleanContent.trim()

  return JSON.parse(cleanContent)
}
