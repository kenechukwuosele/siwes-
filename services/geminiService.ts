
export const analyzeLogEntry = async (description: string) => {
  // AI must be invoked through a protected backend endpoint. Never ship provider keys to browsers.
  return {
    feedback: "AI suggestions are temporarily unavailable while the secure service is being configured.",
    qualityScore: 0,
    technicalKeywords: [],
  };
};

export const summarizeWeeklyProgress = async (logs: string[]) => {
    return "Weekly AI summaries will be available after the protected server-side service is configured.";
};
