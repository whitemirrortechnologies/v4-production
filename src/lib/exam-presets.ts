/** Ready-made exams an admin can add with one click (exam + full syllabus). */
export type PresetTopic = string | { name: string; sub: string[] };
export type PresetSection = { section: string; topics: PresetTopic[] };
export type ExamPreset = { key: string; code: string; name: string; description: string; syllabus: PresetSection[] };

export const EXAM_PRESETS: ExamPreset[] = [
  {
    key: "GATE_CS", code: "GATE_CS", name: "GATE Computer Science & IT",
    description: "Graduate Aptitude Test in Engineering: CS paper (Computer Science and Information Technology).",
    syllabus: [
      {
        "section": "General Aptitude",
        "topics": [
          "Verbal Aptitude",
          "Quantitative Aptitude",
          "Analytical Aptitude",
          "Spatial Aptitude"
        ]
      },
      {
        "section": "Engineering Mathematics",
        "topics": [
          {
            "name": "Discrete Mathematics",
            "sub": [
              "Propositional and First Order Logic",
              "Sets, Relations and Functions",
              "Partial Orders and Lattices",
              "Monoids and Groups",
              "Graphs: Connectivity, Matching, Colouring",
              "Combinatorics: Counting, Recurrence Relations, Generating Functions"
            ]
          },
          {
            "name": "Linear Algebra",
            "sub": [
              "Matrices and Determinants",
              "System of Linear Equations",
              "Eigenvalues and Eigenvectors",
              "LU Decomposition"
            ]
          },
          {
            "name": "Calculus",
            "sub": [
              "Limits, Continuity and Differentiability",
              "Maxima and Minima",
              "Mean Value Theorem",
              "Integration"
            ]
          },
          {
            "name": "Probability and Statistics",
            "sub": [
              "Random Variables",
              "Probability Distributions",
              "Mean, Median, Mode and Standard Deviation",
              "Conditional Probability and Bayes Theorem"
            ]
          }
        ]
      },
      {
        "section": "Digital Logic",
        "topics": [
          "Boolean Algebra",
          "Combinational Circuits",
          "Sequential Circuits",
          "Minimization",
          "Number Representations and Computer Arithmetic"
        ]
      },
      {
        "section": "Computer Organization and Architecture",
        "topics": [
          "Machine Instructions and Addressing Modes",
          "ALU, Data-path and Control Unit",
          "Instruction Pipelining and Hazards",
          "Memory Hierarchy: Cache, Main Memory, Secondary Storage",
          "I/O Interface: Interrupt and DMA"
        ]
      },
      {
        "section": "Programming and Data Structures",
        "topics": [
          "Programming in C",
          "Recursion",
          "Arrays",
          "Stacks and Queues",
          "Linked Lists",
          "Trees and Binary Search Trees",
          "Binary Heaps",
          "Graphs"
        ]
      },
      {
        "section": "Algorithms",
        "topics": [
          "Searching, Sorting and Hashing",
          "Asymptotic Complexity",
          "Greedy Algorithms",
          "Dynamic Programming",
          "Divide and Conquer",
          "Graph Traversals",
          "Minimum Spanning Trees",
          "Shortest Paths"
        ]
      },
      {
        "section": "Theory of Computation",
        "topics": [
          "Regular Expressions and Finite Automata",
          "Context-Free Grammars and Push-Down Automata",
          "Regular and Context-Free Languages, Pumping Lemma",
          "Turing Machines and Undecidability"
        ]
      },
      {
        "section": "Compiler Design",
        "topics": [
          "Lexical Analysis",
          "Parsing",
          "Syntax-Directed Translation",
          "Runtime Environments",
          "Intermediate Code Generation",
          "Local Optimisation",
          "Data Flow Analysis"
        ]
      },
      {
        "section": "Operating System",
        "topics": [
          "System Calls, Processes and Threads",
          "Inter-Process Communication",
          "Concurrency and Synchronization",
          "Deadlock",
          "CPU and I/O Scheduling",
          "Memory Management and Virtual Memory",
          "File Systems"
        ]
      },
      {
        "section": "Databases",
        "topics": [
          "ER Model",
          "Relational Algebra and Tuple Calculus",
          "SQL",
          "Integrity Constraints and Normal Forms",
          "File Organization and Indexing (B and B+ Trees)",
          "Transactions and Concurrency Control"
        ]
      },
      {
        "section": "Computer Networks",
        "topics": [
          "Layering: OSI and TCP/IP",
          "Packet, Circuit and Virtual Circuit Switching",
          "Data Link Layer: Framing, Error Detection, MAC, Ethernet Bridging",
          "Routing Protocols: Shortest Path, Flooding, Distance Vector, Link State",
          "IP Addressing: IPv4, CIDR, Fragmentation",
          "ARP, DHCP, ICMP and NAT",
          "Transport Layer: Flow and Congestion Control, UDP, TCP, Sockets",
          "Application Layer: DNS, SMTP, HTTP, FTP, Email"
        ]
      }
    ],
  },
  {
    key: "CAT", code: "CAT", name: "CAT",
    description: "Common Admission Test: for admission to IIMs and other management programmes.",
    syllabus: [
      {
        "section": "VARC",
        "topics": [
          "Reading Comprehension",
          "Para Jumbles",
          "Para Summary",
          "Odd Sentence Out",
          "Para Completion"
        ]
      },
      {
        "section": "DILR",
        "topics": [
          {
            "name": "Data Interpretation",
            "sub": [
              "Tables",
              "Bar Graphs",
              "Line Charts",
              "Pie Charts",
              "Caselets"
            ]
          },
          {
            "name": "Logical Reasoning",
            "sub": [
              "Arrangements",
              "Puzzles",
              "Games and Tournaments",
              "Venn Diagrams",
              "Networks and Routes",
              "Scheduling"
            ]
          }
        ]
      },
      {
        "section": "QA",
        "topics": [
          {
            "name": "Arithmetic",
            "sub": [
              "Percentages",
              "Profit and Loss",
              "Simple and Compound Interest",
              "Ratio and Proportion",
              "Averages and Mixtures",
              "Time and Work",
              "Time, Speed and Distance"
            ]
          },
          {
            "name": "Algebra",
            "sub": [
              "Linear and Quadratic Equations",
              "Inequalities",
              "Functions and Graphs",
              "Logarithms",
              "Progressions",
              "Polynomials"
            ]
          },
          {
            "name": "Geometry and Mensuration",
            "sub": [
              "Lines and Triangles",
              "Circles",
              "Polygons",
              "Coordinate Geometry",
              "Mensuration",
              "Trigonometry"
            ]
          },
          "Number System",
          {
            "name": "Modern Math",
            "sub": [
              "Permutations and Combinations",
              "Probability",
              "Set Theory",
              "Sequences and Series"
            ]
          }
        ]
      }
    ],
  },
];
