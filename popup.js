
document.getElementById("summarize").addEventListener("click", () => {

    const resultArea = document.getElementById("result");
    const summaryType = document.getElementById("summary-type").value;
    resultArea.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only"></span></div></div>';

    chrome.storage.sync.get(["geminiApiKey"], (result) => {
        if (!result.geminiApiKey) {
            resultArea.textContent = "Please set your Gemini API key in options.";
            return;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            chrome.tabs.sendMessage(
                tab.id, 
                { type: 'GET_ARTICLE_CONTENT' }, 
                async ({ text }) => {
                    if (!text) {
                        resultArea.textContent = "No article content found.";
                        return;
                    }
                    try {
                        const summaryText = await getGeminiSummary(text, summaryType, result.geminiApiKey);
                        resultArea.textContent = summaryText;
                    } catch (error) {
                        console.error("Error fetching summary:", error);
                        resultArea.textContent = "Error fetching summary. Please try again.";
                    }
                }
            );
        });         
    });
});

async function getGeminiSummary(rawText, summaryType, apiKey) {
    const max = 20000;
    const text = rawText.length > max ? rawText.slice(0, max) : rawText;
    const promptMap = {
        "brief": `Summarise the following article in 2-3 sentences:\n\n${text}`,
        "detailed": `Give a detailed summary:\n\n${text}`,
        "bullets": `Summarise in 5-7 bullet points (start each line with "- "):\n\n${text}`
    };
    const prompt = promptMap[summaryType] || promptMap["brief"];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1000,
                topP: 0.95,
                topK: 40
            }
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary available.";
}

document.getElementById("download-btn").addEventListener("click", () => {
    const resultArea = document.getElementById("result");
    const txt = resultArea.textContent;
    if(!txt) {
        return;
    }
    // Copy to clipboard
    navigator.clipboard.writeText(txt).then(() => {
        const btn = document.getElementById("download-btn");
        const old = btn.textContent;
        btn.textContent = "Copied & Downloaded!";
        setTimeout(() => {
            btn.textContent = old;
        }, 2000);
    }).catch(err => {
        console.error("Failed to copy text: ", err);
    });
    // Download as txt
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

