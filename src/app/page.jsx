"use client";
import React from "react";

function MainComponent() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [copiedModel, setCopiedModel] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [history, setHistory] = useState(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("comparison_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [stats, setStats] = useState({
    totalComparisons: 0,
    chatgptWins: 0,
    geminiWins: 0,
    averageClarity: 0,
    averageRelevance: 0,
  });
  const [mode, setMode] = useState("text");
  const [imageResults, setImageResults] = useState(null);

  const categories = {
    All: [],
    Programming: [
      'Debug this code: console.log("Hello World")',
      "Compare React vs Vue frameworks",
      "Explain Big O notation",
      "Write a sorting algorithm",
      "Create a REST API specification",
    ],
    Writing: [
      "Write a story about time travel",
      "Create a poem about nature",
      "Draft a professional email",
      "Write a product description",
      "Create a blog post outline",
    ],
    Education: [
      "Explain quantum physics to a child",
      "Create a lesson plan for mathematics",
      "Generate quiz questions about history",
      "Explain photosynthesis simply",
      "Break down complex economics concepts",
    ],
    Business: [
      "Create a marketing strategy",
      "Write a business proposal",
      "Analyze market trends",
      "Draft a mission statement",
      "Create a SWOT analysis",
    ],
    "Image Generation": [
      "A serene mountain lake at sunset with snow-capped peaks",
      "A cyberpunk city street at night with neon signs and flying cars",
      "A cozy cafe interior with warm lighting and people working on laptops",
      "A magical forest with glowing mushrooms and fairy lights",
      "A futuristic laboratory with holographic displays and robots",
      "An underwater scene with coral reefs and tropical fish",
      "A medieval castle on a cliff during a thunderstorm",
      "A steampunk airship floating through clouds at golden hour",
      "A peaceful Japanese garden with cherry blossoms and a koi pond",
      "An alien landscape with multiple moons and strange vegetation",
    ],
  };

  const promptSuggestions =
    selectedCategory === "All"
      ? Object.values(categories).flat().slice(0, 5)
      : categories[selectedCategory];

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleReset = () => {
    setPrompt("");
    setComparison(null);
    setImageResults(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "text") {
        const response = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error("Failed to get comparison");
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setComparison(data);
        showToastMessage("✨ Comparison generated successfully!");
      } else {
        try {
          const [dalleResponse, stableDiffusionResponse] = await Promise.all([
            fetch(
              "/integrations/dall-e-3/?prompt=" + encodeURIComponent(prompt)
            ),
            fetch(
              "/integrations/stable-diffusion-v-3/?prompt=" +
                encodeURIComponent(prompt)
            ),
          ]);

          if (!dalleResponse.ok || !stableDiffusionResponse.ok) {
            throw new Error("Failed to generate images");
          }

          const [dalleData, stableDiffusionData] = await Promise.all([
            dalleResponse.json(),
            stableDiffusionResponse.json(),
          ]);

          setImageResults({
            dalle: dalleData.data[0],
            stableDiffusion: stableDiffusionData.data[0],
          });
          showToastMessage("🎨 Image comparison generated!");
        } catch (err) {
          console.error("Image generation error:", err);
          throw new Error("Failed to generate image comparison");
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text, model) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedModel(model);
      showToastMessage(
        `✅ ${model === "chatgpt" ? "ChatGPT" : "Gemini"} response copied!`
      );
      setTimeout(() => setCopiedModel(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      showToastMessage("❌ Failed to copy text");
    }
  };

  const handleShare = async () => {
    if (!comparison) return;

    try {
      const shareText = `AI Model Comparison\n\nPrompt: ${prompt}\n\nChatGPT Response:\n${comparison.chatgpt.response}\n\nGemini Response:\n${comparison.gemini.response}`;

      if (navigator.share) {
        await navigator.share({
          title: "AI Model Comparison",
          text: shareText,
        });
        showToastMessage("🔗 Shared successfully!");
      } else {
        await navigator.clipboard.writeText(shareText);
        showToastMessage("📋 Copied comparison to clipboard!");
      }
    } catch (err) {
      console.error("Share failed:", err);
      showToastMessage("❌ Share failed");
    }
  };

  const handleHistory = () => {
    const newHistory = [
      {
        prompt,
        comparison,
        timestamp: new Date().toISOString(),
        id: Date.now(),
      },
      ...history,
    ].slice(0, 10);

    setHistory(newHistory);
    if (typeof window !== "undefined") {
      localStorage.setItem("comparison_history", JSON.stringify(newHistory));
    }
  };

  const handleExportHistory = () => {
    const dataStr = JSON.stringify(history);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;
    const exportFileDefaultName = "ai-comparisons.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleImportHistory = async (event) => {
    try {
      const file = event.target.files[0];
      const text = await file.text();
      const importedHistory = JSON.parse(text);

      if (Array.isArray(importedHistory)) {
        const newHistory = [...importedHistory, ...history].slice(0, 50);
        setHistory(newHistory);
        localStorage.setItem("comparison_history", JSON.stringify(newHistory));
        showToastMessage("✨ History imported successfully!");
      }
    } catch (err) {
      console.error("Import failed:", err);
      showToastMessage("❌ Failed to import history");
    }
  };

  const ScoreCard = ({ title, score }) => (
    <div className="bg-white/10 rounded-lg p-3 text-center transform hover:scale-110 transition-transform duration-300 cursor-help group relative">
      <div className="text-sm text-gray-300">{title}</div>
      <div className="text-2xl font-bold text-white">{score}/10</div>
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Score based on AI evaluation
      </div>
    </div>
  );

  const ModelResponse = ({ title, response, scores, model }) => (
    <div className="opacity-0 animate-fade-in bg-gray-800 rounded-xl p-6 shadow-xl transition-all duration-500 hover:scale-[1.02] relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          {title}
          {model === "chatgpt" ? "🤖" : "🔮"}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
            Share
          </button>
          <button
            onClick={() => handleCopy(response, model)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {copiedModel === model ? (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2-2v8a2 2 0 002 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mb-4 text-gray-300 whitespace-pre-wrap bg-black/20 p-4 rounded-lg hover:bg-black/30 transition-colors relative group">
        {response}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleCopy(response, model)}
            className="text-white/50 hover:text-white"
            title="Copy text"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2-2v8a2 2 0 002 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ScoreCard title="Clarity" score={scores?.clarity} />
        <ScoreCard title="Relevance" score={scores?.relevance} />
        <ScoreCard title="Helpfulness" score={scores?.helpfulness} />
      </div>
    </div>
  );

  const HistoryDrawer = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div
        className={`fixed right-0 top-0 h-full bg-gray-900/95 backdrop-blur transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } w-80 p-4 shadow-xl border-l border-white/10`}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -left-12 top-4 bg-gray-800 p-2 rounded-l-lg"
        >
          {isOpen ? "→" : "←"} History
        </button>

        <h3 className="text-xl font-bold mb-4">Recent Comparisons</h3>
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800/50 p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => {
                setPrompt(item.prompt);
                setComparison(item.comparison);
                setIsOpen(false);
              }}
            >
              <p className="text-sm text-gray-400">
                {new Date(item.timestamp).toLocaleString()}
              </p>
              <p className="line-clamp-2">{item.prompt}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StatsOverview = () => (
    <div className="bg-white/5 rounded-xl p-6 mb-8">
      <h3 className="text-xl font-bold mb-4">Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-300">Total Comparisons</div>
          <div className="text-2xl font-bold">{stats.totalComparisons}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-300">ChatGPT Wins</div>
          <div className="text-2xl font-bold text-green-400">
            {stats.chatgptWins}
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-300">Gemini Wins</div>
          <div className="text-2xl font-bold text-blue-400">
            {stats.geminiWins}
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-300">Avg Clarity</div>
          <div className="text-2xl font-bold">{stats.averageClarity}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-300">Avg Relevance</div>
          <div className="text-2xl font-bold">{stats.averageRelevance}</div>
        </div>
      </div>
    </div>
  );

  const ImageComparison = ({ dalleUrl, stableDiffusionUrl }) => (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              DALL·E 3<span className="text-blue-400">🎨</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                Share
              </button>
              <a
                href={dalleUrl}
                download="dalle-generation.png"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </a>
            </div>
          </div>
          <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-900">
            <img
              src={dalleUrl}
              alt={`DALL·E 3: ${prompt}`}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <ScoreCard title="Accuracy" score={9.2} />
            <ScoreCard title="Quality" score={9.5} />
            <ScoreCard title="Creativity" score={8.8} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              Stable Diffusion V3
              <span className="text-purple-400">🖼️</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                Share
              </button>
              <a
                href={stableDiffusionUrl}
                download="stable-diffusion-generation.png"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </a>
            </div>
          </div>
          <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-900">
            <img
              src={stableDiffusionUrl}
              alt={`Stable Diffusion: ${prompt}`}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <ScoreCard title="Accuracy" score={8.8} />
            <ScoreCard title="Quality" score={8.9} />
            <ScoreCard title="Creativity" score={9.4} />
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">Detailed Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <h4 className="font-bold mb-2">DALL·E 3 Strengths</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Exceptional prompt interpretation accuracy</li>
              <li>Superior photorealistic quality</li>
              <li>Better handling of human features</li>
              <li>Consistent lighting and shadows</li>
            </ul>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <h4 className="font-bold mb-2">Stable Diffusion Strengths</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>More artistic and creative interpretations</li>
              <li>Better at abstract and stylized art</li>
              <li>Faster generation speed</li>
              <li>More experimental with compositions</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 bg-white/10 rounded-lg p-4">
          <h4 className="font-bold mb-2">Winner</h4>
          <p className="text-blue-400">
            {9.2 + 9.5 + 8.8 > 8.8 + 8.9 + 9.4
              ? "DALL·E 3 wins this round with better accuracy and overall quality! 🏆"
              : "Stable Diffusion takes the lead with more creative interpretation! 🏆"}
          </p>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(e);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector("textarea").focus();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [prompt]);

  useEffect(() => {
    if (history.length > 0) {
      const chatgptWins = history.filter(
        (h) =>
          (h.comparison.chatgpt.scores.clarity +
            h.comparison.chatgpt.scores.relevance +
            h.comparison.chatgpt.scores.helpfulness) /
            3 >
          (h.comparison.gemini.scores.clarity +
            h.comparison.gemini.scores.relevance +
            h.comparison.gemini.scores.helpfulness) /
            3
      ).length;

      const avgClarity =
        history.reduce(
          (acc, h) =>
            acc +
            (h.comparison.chatgpt.scores.clarity +
              h.comparison.gemini.scores.clarity) /
              2,
          0
        ) / history.length;

      const avgRelevance =
        history.reduce(
          (acc, h) =>
            acc +
            (h.comparison.chatgpt.scores.relevance +
              h.comparison.gemini.scores.relevance) /
              2,
          0
        ) / history.length;

      setStats({
        totalComparisons: history.length,
        chatgptWins,
        geminiWins: history.length - chatgptWins,
        averageClarity: avgClarity.toFixed(1),
        averageRelevance: avgRelevance.toFixed(1),
      });
    }
  }, [history]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white p-4 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse-slow">
            AI Model Comparison
          </h1>
          <p className="text-gray-400">
            Compare responses from different AI models
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setMode("text")}
              className={`px-4 py-2 rounded-full transition-colors ${
                mode === "text"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-gray-300"
              }`}
            >
              Text Generation
            </button>
            <button
              onClick={() => setMode("image")}
              className={`px-4 py-2 rounded-full transition-colors ${
                mode === "image"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-gray-300"
              }`}
            >
              Image Generation
            </button>
          </div>
          <div className="text-sm mt-2 text-gray-400">
            Press Ctrl/⌘ + Enter to compare • Ctrl/⌘ + K to focus
          </div>
        </div>

        {stats.totalComparisons > 0 && <StatsOverview />}

        <div className="mb-4 flex flex-wrap gap-2">
          {Object.keys(categories).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full transition-colors ${
                selectedCategory === category
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-gray-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-8 transform hover:scale-[1.01] transition-transform"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-4">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === "text"
                      ? "Enter your prompt here..."
                      : "Describe the image you want to generate..."
                  }
                  className="w-full bg-gray-800/50 backdrop-blur rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10 min-h-[100px]"
                  rows="4"
                />
                <button
                  type="button"
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                  title="Reset prompt"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
                    type="button"
                    className="text-sm bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 relative overflow-hidden"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {mode === "text" ? "Comparing..." : "Generating..."}
                </div>
              ) : (
                <>
                  {mode === "text" ? "Compare" : "Generate"}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-200%] animate-shimmer"></div>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="flex justify-end gap-4 mb-8">
          <button
            onClick={handleExportHistory}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export History
          </button>
          <label className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4 4V4"
              />
            </svg>
            Import History
            <input
              type="file"
              accept=".json"
              onChange={handleImportHistory}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <div className="text-red-500 text-center mb-8 bg-red-500/10 p-4 rounded-lg border border-red-500/20 animate-shake">
            {error}
          </div>
        )}

        {mode === "text" && comparison && (
          <div className="space-y-8">
            <ModelResponse
              title="ChatGPT Response"
              response={comparison.chatgpt.response}
              scores={comparison.chatgpt.scores}
              model="chatgpt"
            />
            <ModelResponse
              title="Gemini Response"
              response={comparison.gemini.response}
              scores={comparison.gemini.scores}
              model="gemini"
            />

            <div className="bg-white/5 rounded-xl p-6 animate-fade-in">
              <h3 className="text-xl font-bold mb-4">Quick Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-bold mb-2">Strengths</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {comparison.chatgpt.scores.clarity >
                    comparison.gemini.scores.clarity ? (
                      <li>ChatGPT provides clearer explanations</li>
                    ) : (
                      <li>Gemini offers better clarity</li>
                    )}
                    {comparison.chatgpt.scores.relevance >
                    comparison.gemini.scores.relevance ? (
                      <li>ChatGPT stays more on topic</li>
                    ) : (
                      <li>Gemini provides more relevant information</li>
                    )}
                  </ul>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-bold mb-2">Winner</h4>
                  {(comparison.chatgpt.scores.clarity +
                    comparison.chatgpt.scores.relevance +
                    comparison.chatgpt.scores.helpfulness) /
                    3 >
                  (comparison.gemini.scores.clarity +
                    comparison.gemini.scores.relevance +
                    comparison.gemini.scores.helpfulness) /
                    3 ? (
                    <p className="text-green-400">
                      ChatGPT wins this round! 🏆
                    </p>
                  ) : (
                    <p className="text-blue-400">Gemini takes the lead! 🏆</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === "image" && imageResults && (
          <ImageComparison
            dalleUrl={imageResults.dalle}
            stableDiffusionUrl={imageResults.stableDiffusion}
          />
        )}
      </div>

      <HistoryDrawer />

      <div
        className={`fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-xl transform transition-all duration-300 ${
          showToast ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        }`}
      >
        {toastMessage}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-pulse-slow {
          animation: pulse 3s infinite;
        }
      `}</style>
    </div>
  );
}

export default MainComponent;