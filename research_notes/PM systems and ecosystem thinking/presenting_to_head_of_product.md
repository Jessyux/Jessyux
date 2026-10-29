# Presenting systems and ecosystem thinking to a Head of Product (B2B / healthcare software)

Research notes, compiled 2026-10-29. About 17 tool calls: searches, plus fetches of the primary pages that loaded. Several primary pages could not be read (GitLab CDF body, Healthcare IT News, some NN/g URLs). Where that happened it is noted under Gaps.

## What do heads of product / CPOs say they want to see from PM candidates on cross-functional and systems thinking?

### Takeaway
Public rubrics rarely use the phrase "systems thinking" in IC interview loops. They test it through cross-team impact, stakeholder trade-offs, and collaboration questions. Company career ladders, by contrast, scale explicitly from one team, to across teams, to across departments, and senior and principal postings name "systems thinking" directly. The strongest evidence is a decision story: alternatives considered, trade-offs, who else was affected, and a measurable outcome. Feature lists and polished artefacts count for much less.

### Cited Findings
- GitLab's PM Career Development Framework names four core PM competencies: product roadmap and product-led growth, sensing mechanisms, thought leadership, and aligning teams. Scope widens by level: "Cross functional work" at Senior, across teams at Staff/Manager, across sub-departments at Senior Manager, "Across Departments" at Director. Source: search snippet; the full page body could not be extracted. — [GitLab Handbook, Product Management CDF and Competencies](https://handbook.gitlab.com/handbook/product/product-management/product-cdf-competencies/) (undated living page); [GitLab Competencies](https://handbook.gitlab.com/handbook/competencies/)
- Atlassian PM job postings (2024–2026) name systems thinking directly. Senior PM (Jira): apply systems thinking "to simplify complexity". Group PM: help the team design for "interconnected product components" and coach PMs in systems thinking. Principal PM: "make the complex simple". Note these are job ads, not Atlassian's internal ladder. — [Atlassian Group PM, Jira (Built In)](https://builtin.com/job/group-product-manager-jira/3738183); [Atlassian Principal PM, Confluence (Accel jobs)](https://jobs.accel.com/companies/atlassian/jobs/54765854-principal-product-manager-confluence-flywheel)
- Lenny Rachitsky, "How to interview product managers" (2022-03-22), lists the assessed skills as communication, collaboration, execution, strategy, impact and product sense. Example cross-team prompts: a Chime take-home asks which other product teams a plan would affect and how to address their concerns; an Airbnb exercise asks candidates to balance both sides of the marketplace. The post focuses on how candidates break down and structure a problem more than on the "right" answer. Read via an archived copy. — [Lenny's Newsletter archive copy](https://personal-learnings.pages.dev/reading_room/issues/lennys_newsletter/0504_how-to-interview-product-managers.html)
- Example collaboration question from the same post: "Tell me about a time you disagreed with an engineer". — same source as above
- Reforge describes a model of 12 product competencies used to assess PMs and find gaps. The competency names were not visible. — [Reforge, Maximize the performance of your PMs](https://www.reforge.com/blog/maximize-the-performance-of-your-product-managers) (undated)
- Brian Balfour frames the PM-to-leader shift as moving from maximising return on one type of work to optimising returns across all product work. This was relayed from search, not fetched. — [Brian Balfour, Crossing the Canyon](https://brian-balfour-s5lh.squarespace.com/blog/crossing-the-canyon-product-manager-to-product-leader)
- Mind the Product (Alexandra Ciufudean, 2026-10-21) draws on John Cutler's framing of systems thinking as "situational awareness": how a product interacts with its environment and internal parts, and what changes when one variable shifts. It also cites Senge's "a discipline of seeing the whole". — [Mind the Product, A guide to systems thinking for PMs](https://www.mindtheproduct.com/a-guide-to-systems-thinking-for-product-managers/)
- Sachin Rekhi, who reviews PM portfolios, checks whether the candidate can separate the problem from their specific solution. He also looks for acquisition, engagement and monetisation outcomes. Relayed from search. — [Sachin Rekhi, Evaluating a PM's Portfolio](https://www.sachinrekhi.com/evaluating-a-product-managers-portfolio) (undated)
- Practitioner portfolio guidance says weak case studies assume "unlimited engineering resources" and skip business trade-offs. Strong ones state the alternatives considered and the technical, cost or timeline reasons for the chosen path. Three deep case studies beat ten feature summaries. These are secondary coaching sources, so they are lower authority. — [Leland, PM portfolio guide](https://www.joinleland.com/library/a/product-manager-portfolio); [IdeaPlan, What makes a good PM portfolio](https://www.ideaplan.io/qa/what-makes-a-good-pm-portfolio)

### Inferences
- For a Head of Product, "systems thinking" is persuasive when it shows up as scope beyond one team: named dependent teams, their concerns, how you aligned them, and a business-level outcome. That mirrors how ladders like GitLab's define seniority.
- Atlassian's recurring "make the complex simple" suggests the visual itself is evidence. A slide that tames a messy ecosystem demonstrates the skill being hired for.
- Interview loops test this indirectly, through prompts like "which other teams does this affect?". A candidate should volunteer second-order effects without being asked.

### Gaps
- I could not extract GitLab's full competency definitions; the page body is very long and the fetch returned only navigation.
- I found no public Spotify PM career ladder, and no official Atlassian PM ladder; only job ads.
- No direct quote from a named Head of Product or CPO on "systems thinking" in hiring. The Lenny / Will Larson podcast segment on systems thinking in hiring (Jan 2024) was found only as an episode listing: [Lenny's Podcast, Will Larson](https://podpage.com/lennys-podcast/the-engineering-mindset-will-larson-carta-stripe-uber-calm-digg).

## How to tell a "backbone system" story: dependent teams, feeding systems, second-order effects, whole-business outcomes

### Takeaway
Platform-PM writing gives the narrative frame. Treat internal teams as customers. Make dependencies visible. Ask "what breaks if we delay it?" and "what does this unlock for others?". Measure success by ecosystem health (adoption, integration speed, reliability) more than by one team's KPI.

### Cited Findings
- Kateryna Korotieieva, Mind the Product (2025-12-26): a platform "lives or dies by integration rates, ecosystem health, and developer experience." — [Mind the Product, The platform PM](https://www.mindtheproduct.com/the-platform-pm-building-an-ecosystem-not-just-a-product/)
- The same article on dependent teams: treat internal teams as real customers, with SLAs, versioning policies and feedback loops. Use layered roadmaps and integration charts to show how changes cascade, so local optimisations don't harm global stability. — same source
- The same article on second-order effects: it asks "What breaks if we delay it?" and "What does this unlock for others?" It notes that one API change can disrupt internal workflows, partner commitments and commercial contracts. — same source
- The same article on metrics: integration velocity, ecosystem adoption, API reliability, developer satisfaction. It argues classic KPIs (churn, conversion) miss enablement, and frames the role as stewardship, like city planning. — same source
- Secondary platform-PM sources say to weigh "first order and second order impacts" when prioritising, and to keep asking "and then what happens?". They note platform roles carry more internal stakeholders and more cross-team dependencies than average. — [Medium, On Platform Product Management Part I](https://medium.com/hacking-talent/on-platform-product-management-part-i-826c4d5ed9cc); [Statsig, Second-order effects](https://statsig.com/perspectives/understanding-second-order-effects-in-product-development)
- NN/g says blueprints reveal cross-department dependencies and root causes of systemic problems, and should be aligned to a business goal (e.g. converging siloed processes). — [NN/g, Service Blueprints: Definition (Sarah Gibbons, 2017, reviewed 2026-07-15)](https://www.nngroup.com/articles/service-blueprints-definition/)

### Inferences
- A suggested story arc for a backbone-system case study, synthesised from the sources above:
  1. What the platform is and who depends on it (internal teams as customers).
  2. Upstream systems that feed it, and the data contracts with them.
  3. A change and its cascade ("what breaks if…").
  4. How you aligned teams (roadmap, rollout, SLAs).
  5. Ecosystem metrics plus one whole-business outcome (revenue, cost, risk or clinical-safety outcome).
- Pairing one team-level metric with one enterprise-level metric shows the leap from team optimisation to business optimisation that Balfour and GitLab describe.

### Gaps
- No primary source gives a canonical "backbone system" case-study template. The arc above is synthesis.
- The Bupa Head of Product podcast on platform PM (Teresa Huang, The Product Experience) returned 404 and was not reviewed: [listing](https://www.buzzsprout.com/1797429/episodes/18271450-lessons-in-platform-product-management-teresa-huang-head-of-product-bupa).

## Visualisation patterns executives read quickly

### Takeaway
Use a two-zoom approach. The headline slide is a C4-style system context or hub-and-spoke view: the platform in the centre, people and teams around it, upstream and downstream systems as boxes, no technology detail. A service blueprint or swimlane goes in the appendix or a second step, scoped to one scenario. NN/g and C4 both stress leaving out detail that doesn't serve the goal.

### Cited Findings
- C4 model, System Context diagram: the system in scope is a central box surrounded by its users and the other systems it interacts with. It is meant for technical and non-technical audiences ("you could show to non-technical people"). It excludes technologies and protocols; detail "isn't important here". — [C4 model, System context diagram (Simon Brown)](https://c4model.com/diagrams/system-context) (undated)
- NN/g service blueprint elements: customer actions, frontstage, backstage, processes and evidence, separated by lines of interaction, visibility and internal interaction. Make one blueprint per scenario. Add optional layers (arrows, time, metrics) only when they serve the goal. Arrows show dependency: single for one-way, double for codependency. — [NN/g, Service Blueprints: Definition](https://www.nngroup.com/articles/service-blueprints-definition/)
- Queensland Government service design playbook: an ecosystem map includes all possible stakeholders, while a blueprint covers specific steps and fewer actors. Use the ecosystem map to choose which actors go into the blueprint. — [QLD forgov, Service ecosystem map](https://www.forgov.qld.gov.au/service-design-and-delivery/design-public-services/digital-service-design-playbook/all-plays/service-ecosystem-map)
- Forum One: a robust ecosystem map is made up of many service blueprints. — [Forum One](https://www.forumone.com/?p=1954)
- Hub-and-spoke vs radial: use a centralised diagram when hub primacy is the message, and a radial diagram when nodes are peers. This is vendor guidance, so low authority. — [GoodPello templates](https://www.goodpello.com/en/products/category/216)
- Miro's concentric ecosystem template puts the core offering in the centre with stakeholder rings around it. — [Miro, Ecosystem concentric map](https://miro.com/templates/ecosystem-concentric-map/)

### Inferences
- For "platform as backbone of the business", hub-and-spoke or C4 context with the platform at the centre fits best, because hub primacy is the message.
- Possible layout:
  - Upstream systems on the left (data in) and downstream consumers on the right (data out), with business teams as an outer ring or top band.
  - One accent colour for the single flow that drives the business outcome.
  - At most about 6–8 spokes; group the rest.
- A swimlane / blueprint or value-stream (e.g. order-to-cash, script-to-dispense) works as a second slide or a hover / step reveal, scoped to one scenario as NN/g recommends.
- Label edges with what flows (orders, prescriptions, patient records), not with protocols, which follows C4.

### Gaps
- I found no authoritative research on the maximum number of nodes executives can parse. The "6–8" figure is a judgement, not sourced.
- I did not fetch an NN/g article specifically on ecosystem maps or systems maps (the URL I tried returned 404), or a value-stream / order-to-cash mapping source.

## Healthcare / health-tech specifics: interoperability, compliance, data integrity

### Takeaway
In Australian clinical software, the ecosystem is partly defined by regulation. Systems that connect to national infrastructure (My Health Record, Provider Connect Australia) must meet ADHA conformance profiles framed around clinical safety, privacy and security, and the national direction is FHIR (AU Core via Sparked). A Head of Product in clinical software therefore reads "systems thinking" as including standards, conformance, and data integrity across hand-offs.

### Cited Findings
- ADHA National Healthcare Interoperability Plan 2023–28: 44 actions across five priority areas (identity, standards, benefits, information sharing, innovation). In Nov 2024 ADHA reported being "close to one year ahead of plan". — [Medical Republic, Laura Woodrow, 2024-11-13](https://www.medicalrepublic.com.au/?p=112424)
- Same article: Provider Connect Australia lets clinical and practice management systems connect "through a SMART on FHIR interface". ADHA tendered for FHIR capabilities for My Health Record, and is encouraging adoption of SNOMED CT, NCTS and Ontoserver (AMTv4 delivered on 26 Sep 2024). — same source
- Sparked AU FHIR Accelerator: coordinated by CSIRO for the Department of Health and Aged Care, ADHA and HL7 Australia. AU Core IG Release 1 published early 2025 (status reports say 29 Jan; a slide pack says Feb 2025). R2 is targeted for early 2026. AU eRequesting IG R1 is targeted for Jan 2026. Dates are targets and conflict between documents. — [Sparked status report Jan 2025](https://sparked.csiro.au/wp-content/uploads/2025/05/Sparked-Program-Status-Report_Jan25_Community-1.pdf); [Sparked CDG slide pack Jul 2025](https://sparked.csiro.au/wp-content/uploads/2025/08/CDG-202507-F2F-SYD-slide-pack-ON-DAY.pdf); [Sparked overview](https://sparked.csiro.au/?p=90)
- ADHA introduced a mandatory security conformance profile for clinical information systems connecting to My Health Record. Vendors must submit evidence of conformance and pass testing before production access, with requirements aligned to the Essential Eight over a phased timeline. — [ADHA media release](https://digitalhealth.gov.au/sites/default/files/documents/media-release---increased-cyber-security-requirements-for-systems-connecting-to-my-health-record_0.pdf); [iTnews](https://www.itnews.com.au/news/adha-drafts-new-security-standards-for-my-health-record-interconnection-589327) (release date not confirmed; article not fetched)
- My Health Record Connecting Systems Conformance Profile v1.6 (July 2024) is used to assess software "to help minimise risks to clinical safety, information privacy and security". A vendor declaration form v1.0 is dated 28 Feb 2025. — [ADHA implementer, Conformance Profile v1.6](https://implementer.digitalhealth.gov.au/resources/my-health-record-connecting-systems-conformance-profile-v1-6)
- Australian Commission on Safety and Quality runs a My Health Record clinical safety program. — [ACSQHC](https://www.safetyandquality.gov.au/node/2635)
- US health-tech CPO roles are framed around interoperability: e.g. 1upHealth's CPO (Jan 2024) leads a FHIR platform for claims and clinical data, and Surescripts' product lead ties product to patient safety and interoperability. — [1upHealth CPO announcement](https://1up.health/news/1uphealth-announces-appointment-of-andrea-kowalski-as-chief-product-officer/); [NCPDP, Tara Dragert](https://ncpdp.org/ac/track-sessions.aspx?ID=675)

### Inferences
- On a backbone-system slide for clinical or pharmacy software, mark the regulated edges, such as My Health Record, ePrescribing, PBS and Provider Connect. Note the standard on each (FHIR AU Core, SNOMED CT/AMT) and the conformance or clinical-safety obligation.
- This shows the candidate understands that a change to the platform can trigger re-conformance or clinical-safety risk downstream. That is a second-order effect specific to health.
- Data integrity (one source of truth for patient, prescription and order records across hand-offs) is the health equivalent of "ecosystem health". It is a credible whole-business outcome alongside revenue and cost.

### Gaps
- I found no interview or talk in which a named health-tech Head of Product explicitly says what they look for in PM systems thinking.
- I did not confirm current 2025–26 FHIR conformance requirements for vendors, or the final AU Core R2 publication date. The Healthcare IT News article returned 403.
- TGA software-as-a-medical-device obligations were not researched in this pass.
