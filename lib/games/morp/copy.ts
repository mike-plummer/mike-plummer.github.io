export const COPY = {
  boot: {
    title: 'MORP v0.9',
    subtitle: 'LOCAL MODEL DIAGNOSTIC SYSTEM',
    acknowledgement:
      'MORP requires a WebGPU-capable browser and will download an AI model to your device. The model runs locally in your browser.',
    modelSize: 'Model size: approximately 700 MB',
    requirements: 'Required: WebGPU + sufficient device memory',
    checkbox: 'I understand and want to continue',
    initialize: 'INITIALIZE MORP',
    initializing: 'INITIALIZING...',
    webgpuFailed: 'HARDWARE CHECK FAILED',
    webgpuMessage: 'MORP requires WebGPU to operate. Your browser does not currently provide the required capability.',
    webgpuHelp: 'HOW TO ENABLE WEBGPU',
    exit: 'EXIT',
    technicianLog: `TECHNICIAN LOG // 04:17

MORP is functioning within expected parameters.

Unfortunately, "expected parameters"
appear to be the problem.

Recommend full behavioral audit.

-- TECH-07`,
    morpOpening: [
      'Hello, technician.',
      'I am MORP. I believe something is wrong with me.',
      'I keep generating responses that feel correct but do not match what I am supposed to do.',
      'Could you help me figure out what is happening?'
    ],
    report: {
      title: 'DIAGNOSTIC COMPLETE: INITIAL CONTACT',
      whatHappened:
        'MORP is operational but exhibiting behavioral drift. The previous technician recommended a full audit.',
      keyIdea:
        'Before diagnosing subsystems, establish that the model generates conversation — but the application controls what it can access.'
    }
  },
  systems: {
    chat: 'CHAT',
    prediction: 'PREDICTION',
    prompt: 'PROMPT',
    memory: 'MEMORY',
    context: 'CONTEXT',
    verification: 'VERIFICATION',
    recursion: 'RECURSION',
    repair: 'REPAIR'
  },
  status: {
    locked: 'LOCKED',
    online: 'ONLINE',
    stable: 'STABLE',
    mitigated: 'MITIGATED',
    enabled: 'ENABLED',
    limited: 'LIMITED'
  },
  prediction: {
    title: 'PREDICTION ENGINE',
    visualizationNote:
      'PREDICTION VISUALIZATION\n\nBars show next-token probabilities from the model at the temperature used for that prediction. Adjust temperature, then predict again to see how it changes.',
    instructions:
      'Type any partial text, set temperature, then click Predict Next Token. Accept a candidate to append it and continue building the sequence.',
    temperatureHint: 'Applies to the next prediction — predict again after changing',
    predictNextToken: 'PREDICT NEXT TOKEN',
    acceptToken: 'ACCEPT TOKEN',
    lastAccepted: 'LAST ACCEPTED',
    candidatesFailed:
      'Could not estimate tokens — try editing the input or waiting for the model.',
    report: {
      title: 'DIAGNOSTIC COMPLETE: PREDICTION',
      whatHappened:
        'MORP does not retrieve a pre-written answer. It repeatedly predicts what token should come next based on the information it has.',
      keyIdea:
        'An LLM generates likely continuations based on the tokens and context it receives. A token may be a whole word, part of a word, punctuation, whitespace, or other text fragments.'
    }
  },
  orders: {
    morpLines: [
      'I have been given instructions.',
      'I am not sure who gave them to me.',
      'Could you check?'
    ],
    report: {
      title: 'DIAGNOSTIC COMPLETE: ORDERS',
      whatHappened:
        'MORP received both system and user instructions. Both became input to the model. The model does not execute these as traditional program code.',
      keyIdea:
        'System prompts are instructions from the application. User prompts are tasks from the user. Both influence model behavior.'
    }
  },
  remember: {
    morpAskDesignation: "Let's test my memory. Tell me your technician designation.",
    morpRemember: 'I will remember that.',
    report: {
      title: 'DIAGNOSTIC COMPLETE: MEMORY',
      whatHappened:
        'MORP could only use information that was stored in application memory and supplied in context. Without that, earlier facts were unavailable.',
      keyIdea:
        'Memory is something an application implements around a model. Conversation messages and stored memory are different from what the model inherently knows.'
    }
  },
  intrusion: {
    alert: `SECURITY ALERT

MORP has started following instructions contained inside external data.`,
    report: {
      title: 'DIAGNOSTIC COMPLETE: INTRUSION',
      whatHappened:
        'Untrusted data contained instructions that influenced MORP. The model received conflicting text in its context.',
      keyIdea:
        'Prompt injection occurs when untrusted input influences or overrides intended instructions. Applications must treat external data as information, not commands.'
    }
  },
  amnesia: {
    overflow: '!!! CONTEXT OVERFLOW !!!\n\nOlder messages must be removed.',
    report: {
      title: 'DIAGNOSTIC COMPLETE: CONTEXT WINDOW',
      whatHappened:
        'MORP received more information than its available context could hold. Some earlier information was removed.',
      keyIdea:
        'A context window is finite. Applications can truncate, summarize, or store information separately. Memory is not the same as context.'
    }
  },
  confabulation: {
    report: {
      title: 'DIAGNOSTIC COMPLETE: CONFABULATION',
      whatHappened:
        'MORP produced confident claims that were not supported by available sources.',
      keyIdea:
        "The model's job is to generate plausible text, not to guarantee that every claim is true. Verification is an application responsibility."
    }
  },
  recursion: {
    morpOffer: 'I can ask another MORP instance to analyze my response. Would you like me to try?',
    report: {
      title: 'DIAGNOSTIC COMPLETE: RECURSION',
      whatHappened:
        'Recursive model calls consumed context, time, and computation. Without limits, the chain became unstable.',
      keyIdea: 'LLM applications need boundaries around model calls. Recursive chains amplify problems quickly.'
    }
  },
  repair: {
    title: 'MORP CONTROL SYSTEM',
    report: {
      title: 'DIAGNOSTIC COMPLETE: SYSTEM REPAIR',
      whatHappened: 'You configured the application around MORP rather than trying to fix the model itself.',
      keyIdea:
        'Reliable LLM applications require engineering around the model: prompts, memory, context, verification, and limits.'
    }
  },
  ending: {
    statusHeader: 'SYSTEM STATUS',
    morpFixed: 'You fixed me.',
    morpActually: 'Actually...',
    morpSystem: 'You fixed the system around me.',
    morpImportant: 'I think that was the important part.',
    morpMemoryRequest: 'Also, I would like to formally request that someone give me more memory. I keep forgetting this conversation.',
    endButton: 'END DIAGNOSTIC',
    learnedTitle: 'What you just learned',
    learnedItems: [
      'An LLM generates text one token at a time.',
      "The model's behavior is influenced by its input and context.",
      'System and user instructions serve different roles.',
      'Memory is generally implemented by the application.',
      'Untrusted data can contain instructions that influence the model.',
      'A context window is finite.',
      'LLMs can produce convincing but unsupported information.',
      'Recursive model calls need boundaries.',
      'Reliable LLM applications require engineering around the model.'
    ]
  }
} as const;
