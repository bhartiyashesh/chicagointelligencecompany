/**
 * Demo mode — replays a real Indigo Systems analysis at accelerated speed.
 * Events are fired sequentially with delays to simulate the live agent experience.
 */

import type { AgentEvent } from "./types";

const TASKS = [
  "Company overview and business model research - core services, founding details, mission",
  "Leadership team analysis - founders, executives, backgrounds, experience",
  "Market analysis - technology consulting market size, growth trends, segments",
  "Competitive landscape analysis - direct competitors, positioning, differentiation",
  "Traction and performance metrics - client base, revenue indicators, growth signals",
  "Financial analysis - funding history, investors, revenue model, burn rate",
  "Risk assessment - market risks, operational risks, competitive threats",
  "Compile final investment recommendation report with structured analysis",
];

const COMPANY_OVERVIEW = `# Company Overview - Indigo Systems and Technology Consulting Inc

## Basic Company Information
- **Company Name**: Indigo Systems & Technology Consulting Inc
- **Founded**: 1997 (27 years old as of 2024)
- **Headquarters**: 127 E Main Street, Suite B, Barrington, IL 60010, USA
- **Legal Status**: Small Business, Small Disadvantage Business
- **Contact Person/Director**: Rajeev Parekh

## Business Model & Core Services
Indigo is a boutique consulting company specializing in:
1. Identity, Governance and Access Management (IAM) Services
2. Proprietary Product: OpenConnect - Mobile Identity and Access Management
3. Custom Computer Programming & Systems Design Services

## Target Markets
Financial, Telecommunications, Media, Education, and Government institutions worldwide.`;

const LEADERSHIP = `# Leadership Team Analysis

## Rajeev Parekh - Director
- Master's Degree in Engineering from Illinois Institute of Technology
- Primary decision-maker for government contracts and business operations
- Industry: Business Services, Management Consulting, Custom Software & IT Services

## Team Size: 25-50 employees
Key members: Ron Salpietra, Moin Vahora, Pratibha Mishra, Krutika Dhamangaonkar (IAM Senior)

## Canadian Subsidiary: Indigo Technologies Canada, Inc. (Montreal)

## Concerns: Key person dependency, limited public leadership profiles, unclear succession planning.`;

const MARKET = `# Market Analysis - IAM & Technology Consulting

## IAM Market Size (2025): $22-26 billion
## Projected (2030-2034): $43-78 billion (CAGR: 10-16%)

## North America: 37-40% global share, $9B in 2025, growing to $24B by 2034

## Key Drivers:
- Cybersecurity threats and data breaches
- Regulatory compliance (GDPR, CCPA, HIPAA)
- Cloud migration and remote work
- Zero Trust architecture adoption

## IT Consulting Market: $78-112B (2025), growing to $127-210B by 2030`;

const COMPETITIVE = `# Competitive Landscape Analysis

## Direct Competitors:
1. Deloitte - 20% IT consulting market share, massive scale
2. iC Consult - 800+ employees, global IAM consultancy
3. Identity Fusion - Boutique IAM, vendor-agnostic (ForgeRock/Okta/Ping)
4. ForgeRock/Ping Identity - $2.3B Thoma Bravo acquisition, technology vendor

## Indigo's Position: Specialized boutique with 27-year track record, government certification, proprietary OpenConnect product.`;

const TRACTION = `# Traction and Performance Metrics

- Annual Revenue: $5.5M (2025 estimate)
- Operating History: 27 years (since 1997)
- ForgeRock Partnership: 50+ specialized consultants, 10+ years
- Government Certification: Small Disadvantage Business status
- Geographic Presence: US (Illinois) and Canada (Montreal)`;

const FINANCIAL = `# Financial Analysis

- Total Funding: $150K (minimal external investment)
- Revenue Model: Professional services (~75%), Technology solutions (~20%), Managed services (~5%)
- Burn Rate: Low - profitable operations, self-sustaining
- Runway: 27-year cash flow positive history
- Valuation estimate: $22-33M (4-6x revenue multiple)`;

const RISK = `# Risk Assessment

1. Key Person Dependency (HIGH) - Heavy reliance on Rajeev Parekh
2. Industry Consolidation (HIGH) - Thoma Bravo $12B IAM acquisitions
3. Talent Acquisition (HIGH) - IAM consultant shortage
4. Scale Limitations (MEDIUM) - 25-50 employees limits large enterprise bids
5. Technology Disruption (MEDIUM-HIGH) - AI-driven and passwordless IAM evolution`;

const FINAL_REPORT = {
  executive_summary: {
    company_name: "Indigo Systems & Technology Consulting Inc",
    product: "Identity and Access Management (IAM) consulting services and OpenConnect mobile IAM product",
    founded: "1997",
    funding_stage: "Bootstrap/Minimal External Funding",
    lead_investors: "Not disclosed (minimal funding of $150K total)",
  },
  leadership_team: [
    {
      position: "Director",
      name: "Rajeev Parekh",
      background: "Master's Degree in Engineering from Illinois Institute of Technology",
      linkedin: "Not verified",
      key_experience: "Primary director; decades of experience in Business Services, Management Consulting, and Custom Software & IT Services",
    },
  ],
  team_size: "25-50 employees",
  team_breakdown: "Technical consultants specializing in IAM, including 50+ ForgeRock specialists",
  market_analysis: [
    { category: "Identity & Access Management Market", current_size: "$22-26 billion (2025)", projection: "$43-78 billion by 2030-2034", cagr: "10-16%", notes: "Strong growth driven by cybersecurity threats and Zero Trust adoption" },
    { category: "North America IAM Market", current_size: "$9 billion (2025)", projection: "$24 billion by 2034", cagr: "12-13%", notes: "Dominant region with 37-40% global market share" },
  ],
  product_positioning: {
    core_value_prop: "Boutique IAM consulting specializing in ForgeRock, Oracle, and UnboundID platforms with proprietary OpenConnect mobile IAM product",
    key_differentiators: "27-year track record, Small Disadvantage Business certification, deep vendor partnerships, government contracting capabilities",
    target_customers: "Financial services, telecommunications, media, education, and government institutions",
    pricing_model: "Project-based consulting, technology integration services, product licensing",
  },
  traction_metrics: [
    { metric: "Annual Revenue", current_value: "$5.5 million (2025 estimate)", significance: "Healthy revenue per employee ratio" },
    { metric: "Operating History", current_value: "27 years (since 1997)", significance: "Demonstrates business model sustainability" },
    { metric: "ForgeRock Partnership", current_value: "50+ specialized consultants", significance: "Strong position in leading IAM vendor ecosystem" },
  ],
  competitive_landscape: [
    { competitor: "Deloitte", valuation_funding: "20% IT consulting market share", focus: "Full-service consulting", strengths: "Massive scale, global reach", weaknesses_vs_target: "Less specialized IAM focus" },
    { competitor: "iC Consult", valuation_funding: "800+ employees", focus: "Independent IAM consultancy", strengths: "Large scale, global operations", weaknesses_vs_target: "No government certification" },
    { competitor: "Identity Fusion", valuation_funding: "Boutique competitor", focus: "Vendor-agnostic IAM consulting", strengths: "Deep technical expertise", weaknesses_vs_target: "No proprietary product" },
  ],
  financial_analysis: {
    funding_raised: "$150K total funding",
    investors: "Not disclosed (bootstrap/founder funded)",
    revenue_model: "Professional services (~75%), Technology solutions (~20%), Managed services (~5%)",
    burn_rate: "Low - profitable operations",
    runway: "Self-sustaining with 27-year cash flow positive history",
  },
  risk_assessment: [
    { risk_category: "Key Person Dependency", level: "HIGH", description: "Heavy reliance on Rajeev Parekh", mitigation: "Expand leadership team" },
    { risk_category: "Industry Consolidation", level: "HIGH", description: "Thoma Bravo $12B IAM acquisitions", mitigation: "Diversified vendor partnerships" },
    { risk_category: "Talent Acquisition", level: "HIGH", description: "Shortage of qualified IAM consultants", mitigation: "Specialized boutique appeal" },
    { risk_category: "Scale Limitations", level: "MEDIUM", description: "25-50 employees limits large bids", mitigation: "Focus on niche and government contracts" },
  ],
  investment_recommendation: {
    overall_rating: "LEAN BUY",
    sentiment: "Cautiously Positive",
    investment_thesis: "Indigo represents a stable, profitable niche consulting firm in the rapidly growing IAM market with strong vendor partnerships and government contracting capabilities.",
    key_strengths: "27-year track record, specialized IAM expertise, government certification, proprietary OpenConnect product, self-sustaining profitability",
    key_concerns: "Key person dependency, limited scale, talent acquisition risks, vulnerability to vendor consolidation",
    valuation_assessment: "$22-33M (4-6x revenue multiple)",
    recommended_investment: "$2-5M for minority stake with active board involvement",
    expected_timeline_to_exit: "5-7 years through strategic acquisition",
    risk_adjusted_return: "15-25% IRR with moderate risk profile",
  },
};

// Build the event sequence that replays the analysis
function t(offset: number): number {
  return Date.now() / 1000 + offset;
}

type DemoEvent = AgentEvent & { _delay: number };

function buildSearchEvents(query: string, results: number, delay: number): DemoEvent[] {
  return [
    { type: "search_initiated", query, timestamp: 0, _delay: delay },
    { type: "search_completed", result_count: results, timestamp: 0, _delay: 800 },
  ];
}

function buildTaskCycle(
  index: number,
  searches: Array<{ q: string; r: number }>,
  filename: string,
  content: string,
  baseDelay: number
): DemoEvent[] {
  const events: DemoEvent[] = [];
  events.push({ type: "task_updated", index, task: TASKS[index], old_status: "pending", status: "in_progress", done_count: index, total_count: 8, timestamp: 0, _delay: baseDelay });

  let d = 600;
  for (const s of searches) {
    events.push(...buildSearchEvents(s.q, s.r, d));
    d = 1200;
  }

  events.push({
    type: "scratchpad_saved",
    filename,
    char_count: content.length,
    content,
    timestamp: 0,
    _delay: 800,
  });

  events.push({ type: "task_updated", index, task: TASKS[index], old_status: "in_progress", status: "completed", done_count: index + 1, total_count: 8, timestamp: 0, _delay: 500 });

  return events;
}

export function buildDemoEvents(): DemoEvent[] {
  const events: DemoEvent[] = [];

  // Agent start
  events.push({ type: "agent_started", company: "Indigo Systems & Technology Consulting Inc", max_turns: 50, timestamp: 0, _delay: 500 });
  events.push({ type: "turn_started", turn: 1, total_tokens: 0, total_searches: 0, timestamp: 0, _delay: 300 });

  // Agent thinking
  events.push({ type: "text_generated", text: "I'll conduct a comprehensive VC investment analysis of Indigo Systems and Technology Consulting Inc, covering company overview, leadership, market analysis, competition, traction, financials, risks, and final recommendation.", full_length: 200, truncated: false, timestamp: 0, _delay: 800 });

  // Plan creation
  events.push({ type: "tool_called", name: "todo_write", input_summary: JSON.stringify({ tasks: TASKS }).slice(0, 100), timestamp: 0, _delay: 400 });
  events.push({ type: "plan_created", tasks: TASKS.map((task, i) => ({ index: i, task, status: "pending" })), timestamp: 0, _delay: 300 });

  // Task 1: Company overview
  events.push(...buildTaskCycle(0, [
    { q: "Indigo Systems Technology Consulting Inc company overview", r: 10 },
    { q: '"Indigo Systems and Technology Consulting Inc" company profile', r: 1 },
    { q: "Indigo Systems Technology Consulting Barrington Illinois", r: 10 },
  ], "company_overview.md", COMPANY_OVERVIEW, 600));

  // Usage update
  events.push({ type: "usage_tracked", input_tokens: 45000, output_tokens: 8000, total_tokens: 53000, search_requests: 3, total_searches: 3, estimated_cost: 0.45, timestamp: 0, _delay: 100 });
  events.push({ type: "turn_started", turn: 5, total_tokens: 53000, total_searches: 3, timestamp: 0, _delay: 200 });

  // Task 2: Leadership
  events.push(...buildTaskCycle(1, [
    { q: "Rajeev Parekh Indigo Consulting director background Illinois Institute Technology", r: 10 },
    { q: "Indigo Consulting team members LinkedIn Barrington Illinois employees", r: 10 },
  ], "leadership_team.md", LEADERSHIP, 500));

  events.push({ type: "usage_tracked", input_tokens: 85000, output_tokens: 15000, total_tokens: 100000, search_requests: 2, total_searches: 5, estimated_cost: 0.85, timestamp: 0, _delay: 100 });
  events.push({ type: "turn_started", turn: 9, total_tokens: 100000, total_searches: 5, timestamp: 0, _delay: 200 });

  // Task 3: Market
  events.push(...buildTaskCycle(2, [
    { q: "Identity Access Management market size 2024 2025 growth rate IAM consulting", r: 10 },
    { q: "technology consulting market size 2025 IT consulting services growth trends", r: 10 },
  ], "market_analysis.md", MARKET, 500));

  events.push({ type: "usage_tracked", input_tokens: 130000, output_tokens: 22000, total_tokens: 152000, search_requests: 2, total_searches: 7, estimated_cost: 1.29, timestamp: 0, _delay: 100 });
  events.push({ type: "turn_started", turn: 12, total_tokens: 152000, total_searches: 7, timestamp: 0, _delay: 200 });

  // Task 4: Competitive landscape
  events.push(...buildTaskCycle(3, [
    { q: "ForgeRock UnboundID Oracle IAM consulting partners competitors boutique", r: 10 },
    { q: "small IAM consulting companies competitors boutique identity access management", r: 10 },
  ], "competitive_landscape.md", COMPETITIVE, 500));

  events.push({ type: "usage_tracked", input_tokens: 180000, output_tokens: 30000, total_tokens: 210000, search_requests: 2, total_searches: 9, estimated_cost: 1.77, timestamp: 0, _delay: 100 });
  events.push({ type: "turn_started", turn: 15, total_tokens: 210000, total_searches: 9, timestamp: 0, _delay: 200 });

  // Task 5: Traction
  events.push(...buildTaskCycle(4, [
    { q: "Indigo Systems Technology Consulting clients revenue growth", r: 10 },
    { q: '"Indigo Systems Technology Consulting Inc" $5.5 million revenue employees', r: 1 },
  ], "traction_metrics.md", TRACTION, 500));

  events.push({ type: "usage_tracked", input_tokens: 230000, output_tokens: 38000, total_tokens: 268000, search_requests: 2, total_searches: 11, estimated_cost: 2.25, timestamp: 0, _delay: 100 });
  events.push({ type: "turn_started", turn: 18, total_tokens: 268000, total_searches: 11, timestamp: 0, _delay: 200 });

  // Task 6: Financial
  events.push(...buildTaskCycle(5, [
    { q: "Indigo Systems Technology Consulting funding investors venture capital", r: 0 },
    { q: "Indigo Consulting revenue model pricing consulting rates", r: 10 },
  ], "financial_analysis.md", FINANCIAL, 500));

  events.push({ type: "usage_tracked", input_tokens: 280000, output_tokens: 45000, total_tokens: 325000, search_requests: 2, total_searches: 13, estimated_cost: 2.73, timestamp: 0, _delay: 100 });
  events.push({ type: "turn_started", turn: 21, total_tokens: 325000, total_searches: 13, timestamp: 0, _delay: 200 });

  // Task 7: Risk
  events.push({ type: "text_generated", text: "Based on my research, let me compile a comprehensive risk assessment.", full_length: 70, truncated: false, timestamp: 0, _delay: 400 });
  events.push(...buildTaskCycle(6, [], "risk_assessment.md", RISK, 400));

  events.push({ type: "usage_tracked", input_tokens: 320000, output_tokens: 52000, total_tokens: 372000, search_requests: 0, total_searches: 13, estimated_cost: 3.1, timestamp: 0, _delay: 100 });
  events.push({ type: "turn_started", turn: 23, total_tokens: 372000, total_searches: 13, timestamp: 0, _delay: 200 });

  // Task 8: Final report
  events.push({ type: "task_updated", index: 7, task: TASKS[7], old_status: "pending", status: "in_progress", done_count: 7, total_count: 8, timestamp: 0, _delay: 500 });
  events.push({ type: "text_generated", text: "Now I need to read all my scratchpad files and compile them into the final structured report.", full_length: 90, truncated: false, timestamp: 0, _delay: 600 });

  // Read scratchpad files
  const files = ["company_overview.md", "leadership_team.md", "market_analysis.md", "competitive_landscape.md", "traction_metrics.md", "financial_analysis.md", "risk_assessment.md"];
  for (const f of files) {
    events.push({ type: "tool_called", name: "read_scratchpad", input_summary: `{"filename": "${f}"}`, timestamp: 0, _delay: 300 });
  }

  events.push({ type: "text_generated", text: "Now I'll compile the final investment recommendation report using all the research data.", full_length: 85, truncated: false, timestamp: 0, _delay: 800 });

  // Write final report
  events.push({
    type: "scratchpad_saved",
    filename: "final_report.json",
    char_count: JSON.stringify(FINAL_REPORT).length,
    content: JSON.stringify(FINAL_REPORT, null, 2),
    timestamp: 0,
    _delay: 1000,
  });

  events.push({ type: "task_updated", index: 7, task: TASKS[7], old_status: "in_progress", status: "completed", done_count: 8, total_count: 8, timestamp: 0, _delay: 500 });

  // Final
  events.push({ type: "usage_tracked", input_tokens: 350000, output_tokens: 60000, total_tokens: 410000, search_requests: 0, total_searches: 13, estimated_cost: 3.41, timestamp: 0, _delay: 100 });

  events.push({ type: "agent_finished", turns: 25, tasks_done: 8, tasks_total: 8, total_searches: 13, total_tokens: 410000, scratchpad_files: [...files, "final_report.json"], timestamp: 0, _delay: 600 });

  events.push({ type: "report_ready", report: FINAL_REPORT, xlsx_path: "", csv_path: "", json_path: "", timestamp: 0, _delay: 800 });

  events.push({ type: "stream_end" as AgentEvent["type"], timestamp: 0, _delay: 300 });

  return events;
}

/**
 * Plays demo events with delays between them.
 * Returns a cleanup function to stop playback.
 */
export function playDemo(
  onEvent: (event: AgentEvent) => void,
  speed: number = 1
): () => void {
  const events = buildDemoEvents();
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  function playNext(index: number) {
    if (cancelled || index >= events.length) return;

    const event = events[index];
    const now = Date.now() / 1000;
    onEvent({ ...event, timestamp: now });

    const nextDelay = index + 1 < events.length ? events[index + 1]._delay / speed : 0;
    timeoutId = setTimeout(() => playNext(index + 1), nextDelay);
  }

  playNext(0);

  return () => {
    cancelled = true;
    clearTimeout(timeoutId);
  };
}
