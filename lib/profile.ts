export const aboutCopy = {
  heading: 'About Mike',
  greeting: 'Hello!',
  introTitle: 'A little bit about myself',
  intro:
    "I'm a full-stack developer, dabbling in a bit of everything. Lots of front-end development in React and Vue, and a fair share of backend crunching with Typescript in Node.js. Graduate of Iowa State and Penn State with almost 20 years of hobby and professional development under my belt.",
  currentRole: 'I am currently with Cypress, working from Dallas, Texas.'
} as const;

export const educationCopy = {
  heading: 'Education',
  subtitle: "I've been certified to know things",
  degrees: [
    {
      level: 'Bachelor of Science',
      field: 'Computer Engineering',
      school: 'Iowa State University'
    },
    {
      level: 'Master of Engineering',
      field: 'Software Engineering',
      school: 'Pennsylvania State University'
    }
  ]
} as const;
