export const portfolioData = {
  name: "Julian Mangual",
  title: "🧑🏻‍💻 Software Engineer | Data | Infrastructure",
  profileImage: "https://i.imgur.com/P4RN7Fb.png", // Add your profile image URL here
  navLinks: [
    {
      name: "About",
      url: "about"
    },
    {
      name: "Experience",
      url: "experience"
    },
    {
      name: "Education",
      url: "education"
    },
    {
      name: "Projects",
      url: "projects"
    }
  ],
  about: {
    title: "About Me",
    description: "Building scalable backend systems, AI products, and tools.",
    resumeLink: "https://drive.google.com/uc?export=download&id=1cMso5a9kgt-pFG5xa7Qe2LItPR-dsXue", // Direct download link to your resume
    downloadText: "Download Resume",
    status: "Open for Interviews"
  },
  projects: {
    title: "My Projects 🧑🏻‍💻",
    projects: [
      {
        title: 'MyndHaven - Mental Wellness Platform',
        description: `MyndHaven is a full mental wellness platform I designed and built end to end. The SwiftUI iOS app (iOS 17+) covers journaling with offline drafts, eight validated screenings (PHQ-9, GAD-7, ASRS, PCL-5, PSS-10, ISI, MDQ, OCI-R) with scored history, mood tracking, community posts and groups, wellness events, therapist appointments, and a streaming AI companion. Behind it sits a Go microservice backend: a stateless gateway that authenticates every request at the edge, a JWT auth service with rotating refresh sessions, and a PostgreSQL core API that owns all product data. AI runs locally through a FastAPI + Ollama (Gemma 3) ReACT agent with a crisis safety gate and tools that can read journals, log moods, and find therapists. A Next.js + TypeScript therapist dashboard and the myndhaven.com waitlist site round out the platform.`,
        demoLink: 'https://myndhaven.com',
        videoUrl: 'https://i.imgur.com/Vyjihls.mp4',
        image: '/assets/myndhaven-card.svg',
        liveDemoText: "Visit MyndHaven.com"
      },
      {
        title: 'Skipper - Cozy Jump Rope Fitness App',
        description: `Skipper is an iPhone jump-rope fitness app built with Swift 6, SwiftUI, MetalKit, and SwiftData, with a Swift server package alongside it. One persisted character configuration drives two interchangeable renderers: a layered 2D SwiftUI scene and a procedural Metal 3D scene with a constrained camera, soft shadows, and a GPU particle system on a memory-pressure-aware resource pool. Sessions run through a single state machine behind a pluggable tracker factory, so the simulated tracker can be swapped for a physical-motion path that reads Core Motion from compatible AirPods and a companion watchOS capture app, which streams samples into append-only JSONL fixtures for observer-labeled validation. Rhythm Garden scores beat-matched routines against the player's Apple Music library through MusicKit, Guided Flow coaches self-relative cadence zones rather than a universal target, and every sound is synthesized live through an AVAudioEngine voice pool instead of mixed from samples. On the server side, a Hummingbird and PostgreSQL economy service enforces earning rules from a shared pure-Swift package: idempotent session ingest, an append-only token ledger whose double-credit defense is a database constraint, attestation verdicts recorded as scored at the time, and SQL migrations verified by a GitHub Actions Postgres job. Roughly 1,400 tests run across the package and hosted suites, next to a full accessibility pass covering Dynamic Type, VoiceOver scene descriptions, and Reduce Motion.`,
        githubLink: '#',
        videoUrl: '/assets/skipper-demo.mp4',
        image: '/assets/skipper-card.svg',
        githubText: "GitHub"
      },
      {
        title: 'Mobile Shopping App (Target-Inspired UI)',
        description: 'E-commerce mobile app built with React Native and Typescript simulating a real-world storefront with cart tracking, sessions, and RESTful APIs',
        demoLink: 'https://youtu.be/6tOS1sOhP3M',
        videoUrl: 'https://i.imgur.com/HUIV022.mp4',
        githubLink: '#',
        image: 'https://i.imgur.com/WKiT4yX.png',
        liveDemoText: "Live Demo",
        githubText: "GitHub"
      },
      {
        title: 'Cross-Platform Music Streaming App (Spotify-Inspired UI)',
        description: 'Real-time music streaming app front end built with React Native, simulating Spotify-like playback, dynamic queueing, and backend security features with a responsive, accessible UI',
        demoLink: 'https://youtu.be/szzBixBjnZo',
        videoUrl: 'https://i.imgur.com/MrYuKr9.mp4',
        githubLink: '#',
        image: 'https://i.imgur.com/HUjnB7j.png',
        liveDemoText: "Live Demo",
        githubText: "GitHub"
      },
      {
        title: 'Weather App',
        description: 'Cross-platform weather application built with React Native and TypeScript, featuring real-time forecast data, modular components, and mobile-optimized UI.',
        demoLink: 'https://youtu.be/WGAw3S2-gz0?si=OQ9VnJ1Rp6OB33JP',
        videoUrl: 'https://i.imgur.com/JZE2reh.mp4',
        githubLink: '#',
        image: 'https://i.imgur.com/Ml36i08.png',
        liveDemoText: "Live Demo",
        githubText: "GitHub"
      },
      {
        title: 'Personal Portfolio Website',
        description: 'Responsive portfolio website built with React.js, showcasing projects, experience, and education with smooth scrolling and modern design.',
        demoLink: 'https://youtu.be/VB9gK5rEgqU',
        videoUrl: 'https://i.imgur.com/kWEdpun.mp4',
        githubLink: 'https://github.com/JacketJulian/Portfolio-Website-Julian-.git',
        image: 'https://i.imgur.com/d43g2EV.jpeg',
        liveDemoText: "Live Demo",
        githubText: "GitHub",
      },
      ]
    },
    headings: {
      projects: "My Projects 🧑🏻‍💻",
      experience: "My Experience 💼",
      education: "My Education 👨🏻‍🎓",
  },
  experience: {
    jobs: [
      {
        companyName: "Target Corporation",
        jobTitle: "Software Engineer",
        date: "September 2025 - Present",
        location: "Minneapolis, MN",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Target_logo.svg/1200px-Target_logo.svg.png", // Placeholder for company logo
        techStack: ["React", "Java", "Spring Boot", "SQL", "Agile Methologies", "Git", "CI/CD Pipelines", "JUnit", "APIs", "Microservices", "Docker", "Kubernetes", "Apache Spark", "Apache Hive", "Hadoop", "Apache Kafka", "GCP", "HDFS", "Vue", " JavaScript", "TypeScript", "Node.js", "HBase", "Cassandra", "NoSQL","YAML"]
      },
      {
        companyName: "The Dev Effect",
        jobTitle: "Software Engineer Intern/Research Engineer Intern",
        date: "June 2023 - August 2023",
        location: "New Haven, CT",
        logo: "https://images.squarespace-cdn.com/content/v1/5d233359babc7000011ff097/c817fff0-6751-4de0-8666-e9a49cca6cc4/3color_Dev_Effect_logo_ondark_1000px_wide_800px_tall.png?format=1500w", // Placeholder for company logo
        techStack: ["Python", "Flask", "Generative AI", "NLP", "APIs", "CI/CD Pipelines", "PyTest", "Git"]
      },
      {
        companyName: "Southern Connecticut State University",
        jobTitle: "Data Structures & Algorithms Tutor",
        date: "August 2022 - May 2023",
        location: "New Haven, CT",
        logo: "https://southernctowls.com/images/2019/7/10/1000_sc_with_talon.jpg", // Placeholder for company logo
        techStack: ["Python", "Data Structures", "Algorithms", "Problem Solving"]
      },
    ]
  },
  education: {
    title: "My Education 👨🏻‍🎓",
    coursesTitle: "Relevant Coursework",
    courses: ["Data Structures", "Algorithms", "Object-Oriented Programming", "Web Development", "Database Management"],
    degrees: [
      {
        institutionName: "Southern Connecticut State University",
        degree: "Bachelor of Science in Computer Science",
        date: "2019 - 2023",
        location: "New Haven, CT",
        logo: "https://southernctowls.com/images/2019/7/10/1000_sc_with_talon.jpg"
      }
    ]
  },
  socialLinks: [
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/in/julian-mangual-949a0622b/"
    },
    {
      name: "GitHub",
      url: "https://github.com/JacketJulian/"
    }
  ],
  footer: {
    text: `TERMS, CONDITIONS, AND LEGALESE (v2.7.1-stable)

Trade-in values will vary based on the condition, year, and Git blame history of your eligible legacy codebase. Not all node_modules folders are eligible for credit. You must be at least age >= 18 to trade in. Trade-in value may be applied toward a qualifying new side project, or added to your Stack Overflow reputation. Actual value awarded is based on receipt of a qualifying pull request matching the description provided in the original issue. Sales tax may be assessed on the full value of any new MacBook Pro purchase. In-person trade-in requires presentation of a valid GitHub profile (local HR department may require saving this information). Some offices may have additional whiteboard interview requirements. Apple, or its trade-in partners, reserve the right to refuse, cancel, or git revert any trade-in transaction for any reason. 

// TODO: add more details here AT&T Special Deal (for Software Engineers Who've Been Meaning to Refactor That Module Since 2019): Monthly price reflects net monthly payment after application of technical debt credits applied over 36 sprints with purchase of an iPhone 17 Pro and trade-in of one (1) spaghetti codebase. Receive credit of either $1100, $830, or $350 based on cyclomatic complexity and ratio of comments to actual code. /* this should never happen */ comments do not count. Requires upgrade of an existing line or activation of a new line and a pinky-promise to write unit tests this time. Customers purchasing this offer through Apple cannot add the "I'll Do It Tomorrow" option. $0 down for well-qualified candidates only; down payment may be required depending on number of console.log("here") statements left in production. Tax on full retail price due at sale. AT&T may temporarily throttle your data if the network is busy, much like your CI/CD pipeline on a Friday afternoon. If you cancel eligible service, credits will stop and you will owe the remaining balance, plus interest compounded at O(n²). Activation/Upgrade Fee: $35. undefined is not a valid payment method. Bill credits are applied as a monthly credit over 36 months. To receive all credits, your main branch must remain on the installment agreement for the entire term and must not have any unresolved merge conflicts. Limited-time offer; subject to change without deprecation notice.

Boost Mobile Special Deal (No Trade-in Required, Unlike Your Old Job That Required You to Maintain a 40-Year-Old COBOL System): Buy a new iPhone and get $830 in bill credits applied over 36 months. No trade-in required. If you are trading in a device with this deal, trade-in value will be applied as additional bill credits—or as a cautionary tale. Monthly price reflects net monthly payment after application of $830 in bill credits. Requires activation of a new line, an Infinite Loop-free plan, and purchase on a qualifying 36-month installment plan subject to carrier credit qualification, peer code review, and a successful npm install with zero vulnerabilities. After making 12 installment payments, you may upgrade to a new iPhone. To receive all credits, the device must remain on the agreement for the entire term, and you must not push directly to main. Limited-time offer; git stash does not pause the timer. Limits: one credit per line. One line per function, please. May not be combined with other offers, discounts, or stack traces.
T-Mobile Special Deal (For Engineers on an Experience Beyond Plan, Which Is What We're Calling "Survived a Kubernetes Outage" Now): Monthly price reflects net monthly payment after application of T-Mobile trade-in credit applied over 24 sprints with purchase of an iPhone 17 and trade-in of eligible smartphone. Any Condition trade-in offer requires Go5G Next plan or equivalent caffeine dependency. Max bill credits will not exceed the cost of the device or your AWS bill, whichever is lower. Credit comprised of (i) Apple instant trade-in credit at checkout and (ii) T-Mobile monthly bill credits applied over 24 months, assuming your cron job doesn't fail silently. Allow 2 billing cycles from valid submission. Tax on pre-credit price due at sale. Contact T-Mobile before cancelling your entire account—or before cancelling your entire prod database without a backup. Bill credits end if you pay off early, just like a recursive function with no base case.

Existing customers: Receive credit of $1100, $800, or $500 based on your plan tier and whether your last PR had a description longer than "fix stuff." Must be an existing T-Mobile customer. Must have heard of Docker. Knowing what it does is preferred but not required.
New customers: Receive credit based on your plan and trade-in condition. Must be a new T-Mobile customer. Familiarity with the phrase "it works on my machine" appreciated.
Verizon Special Deal (Unlimited Ultimate Plan, Which Is Also What We Call Our Microservices Architecture): Monthly price reflects net monthly payment after application of Verizon trade-in credits applied over 36 months.
Existing customers on Unlimited Ultimate plan (min. $90/mo with AutoPay, taxes, fees, and at least one on-call rotation per quarter): Receive $1100 or $830 credit based on trade-in model. Must be an existing Verizon customer. Must be able to explain the difference between == and === without Googling it.
New or Add-a-Line customers: Same credits as above. Must be new to Verizon. Being new to programming is technically allowed but strongly discouraged. Customer must remain in the Verizon Device Payment Program for 36 months to receive full benefit of bill credits—much like you must remain employed for 4 years to receive full vesting of equity. Bill credits may take 1–2 cycles to appear. If it takes two cycles, you'll see the credit for the first cycle on your second bill, right next to the passive-aggressive comment your senior dev left on your first commit. Requires trade-in of eligible device. Must be at least 18 to trade in. null is not a valid age. In-store trade-in requires a valid government-issued photo ID. In-store promotion subject to local law; speak to a Specialist—or post in the team Slack channel and wait three business days for a response.
iPhone 17e Special Deal (The 'e' Stands for 'eventually it will compile'): Monthly price reflects net monthly payment after application of bill credits applied over 36 months. Requires upgrade of an existing line or activation of a new line. Customers upgrading who buy an iPhone 17e 256GB will receive $383 in bill credits; customers buying the 512GB model will receive $403—because more storage means more space to accumulate unused dependencies. Credits start within 3 bills. Wireless line must be on an installment agreement, active, and in good standing for 30 days, similar to your feature branch that has been "almost ready" for 30 days. To receive all credits, device must remain on agreement for entire term and you must keep eligible service on device for entire installment term. Resetting the device and calling it a "clean architecture rewrite" does not extend your credits. Limited-time offer; subject to change. Limits: one credit per line. Unlimited lines not available in this universe. May not be combinable with other offers. NullPointerException is not a valid reason for a refund.

iPhone 16 Special Deal (For Those Who Skipped 17 Because the Migration Guide Was 47 Pages Long): Monthly price reflects net monthly payment after application of bill credits applied over 36 months. Buy an iPhone 16 128GB and activate a new line for $621.36 in bill credits, or upgrade an existing line for $441.36. The difference in credit is explained somewhere in a PDF that requires Adobe Acrobat and a firmware update to open. Requires purchase on a qualifying 36-month 0% APR installment plan, subject to carrier credit qualification. Tax on full retail price due at sale. Requires activation on eligible unlimited plan. Credits are applied as a monthly credit over 36 months. Bill credits begin within 3 billing cycles, or 3 Jira sprints, depending on your preferred unit of time. To receive all credits, device must remain on agreement for entire term. Switching carriers mid-plan will result in credit termination, much like switching from tabs to spaces mid-project. Activation required. sudo will not help you here.


A subscription is required for Apple Arcade, Apple Fitness+, Apple Music, Apple TV+, and maintaining the illusion that your technical debt is "manageable." Features are subject to change. Some features, applications, and services may not be available in all regions, all browsers, or any version of Internet Explorer. Void where prohibited by compiler errors.`

  },
  colors: {
    primary: '#3B3B3B',
    bubbleBlue: '#2294fb',
    tertiary: '#191970',
    white: '#fff',
    skyBlue: '#87CEEB',
    lavender: '#E6E6FA',
    lightBlue: '#ADD8E6'
  }
};
