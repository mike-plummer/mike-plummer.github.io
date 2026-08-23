export interface Employer {
  company: string;
  role: string;
  period: string;
  icon: string;
  highlights: string[];
}

export interface Project {
  name: string;
  company: string;
  description: string;
  icon: string;
}

export const employers: Employer[] = [
  {
    company: 'Lockheed Martin',
    role: 'Senior Software Engineer',
    period: '2009 - 2015',
    icon: 'logo lockheed',
    highlights: ['Defense sector Java & REST service development']
  },
  {
    company: 'Object Partners / Improving',
    role: 'Principal Consultant',
    period: '2015 - 2022',
    icon: 'logo improving',
    highlights: [
      'Mutual of Omaha',
      'TD Ameritrade',
      'US Air Force',
      'WoodmenLife',
      'Chewy.com'
    ]
  },
  {
    company: 'Cypress.io',
    role: 'Lead Engineer, Full Stack',
    period: '2022 - Present',
    icon: 'logo cypress',
    highlights: [
      'Component Testing',
      'UI Coverage',
      'Studio AI / Test Generation',
      'Cloud MCP & CLI',
      'Agentic workflow enablement'
    ]
  },
];

export const projects: Project[] = [
  {
    name: 'UI Coverage',
    company: 'Cypress.io',
    description:
      'Records the full DOM of every moment of a QA test, analyzes interactive elements, and surfaces gaps in test coverage.',
    icon: 'fa-crosshairs'
  },
  {
    name: 'Agentic Workflows',
    company: 'Cypress.io',
    description:
      'Agent Skills, LLM-optimized documentation, MCP server, CLI, and test-runner hooks for autonomous test triage and generation.',
    icon: 'fa-magic'
  }
];
