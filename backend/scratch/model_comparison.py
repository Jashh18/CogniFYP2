import sys
import os
import time
import json
from dotenv import load_dotenv

# Add the app directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv()

from app.services.llm_service import _call_llm
from groq import Groq
import google.generativeai as genai

# Test samples
SAMPLES = [
    {
        "name": "Pride and Prejudice (Literature)",
        "content": "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.",
        "label": True
    },
    {
        "name": "The Waste Land (Literature - Poetry)",
        "content": "April is the cruellest month, breeding Lilacs out of the dead land, mixing Memory and desire, stirring Dull roots with spring rain. Winter kept us warm, covering Earth in forgetful snow, feeding A little life with dried tubers.",
        "label": True
    },
    {
        "name": "React Hooks (Non-Literature - Tech)",
        "content": "Hooks are a new addition in React 16.8. They let you use state and other React features without writing a class. Hooks are backward-compatible. This page provides an overview of Hooks for experienced React users.",
        "label": False
    },
    {
        "name": "Linear Algebra (Non-Literature - Math)",
        "content": "A system of linear equations is a collection of one or more linear equations involving the same set of variables. For example, 3x + 2y - z = 1 is a linear equation in three variables x, y, z.",
        "label": False
    },
    {
        "name": "Medical Journal (Non-Literature - Science)",
        "content": "The study investigates the efficacy of mRNA vaccines in inducing T-cell responses against variants of concern. Data from 500 participants were analyzed using flow cytometry.",
        "label": False
    },
    {
        "name": "Post-Colonial Theory (Literature - Criticism)",
        "content": "Post-colonialism is the critical academic study of the cultural legacy of colonialism and imperialism, focusing on the human consequences of the control and exploitation of colonized people and their lands.",
        "label": True
    }
]

def benchmark_models():
    results = {
        "gemini-2.0-flash": {"correct": 0, "total": 0, "times": []},
        "llama-3.3-70b": {"correct": 0, "total": 0, "times": []}
    }

    system_prompt = (
        "You are an academic classifier. Determine if the following text is related to English Literature studies (novels, poetry, plays, literary theory). "
        "Respond ONLY with a JSON object: {\"is_literature\": boolean}"
    )

    for sample in SAMPLES:
        print(f"Testing: {sample['name']}")
        
        # Test Gemini
        start = time.time()
        try:
            res_gemini = _call_llm(system_prompt, sample['content'], json_mode=True)
            duration = time.time() - start
            results["gemini-2.0-flash"]["times"].append(duration)
            data = json.loads(res_gemini)
            if data.get("is_literature") == sample["label"]:
                results["gemini-2.0-flash"]["correct"] += 1
            results["gemini-2.0-flash"]["total"] += 1
        except Exception as e:
            print(f"Gemini error: {e}")

        # Test Groq (LLaMA)
        # Note: _call_llm defaults to Gemini, then falls back. 
        # For a direct comparison, I'll force Groq if needed or just rely on the fallback logic if I disable Gemini.
        # But let's call Groq directly for cleaner benchmark.
        start = time.time()
        try:
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": sample['content']}],
                response_format={"type": "json_object"}
            )
            duration = time.time() - start
            results["llama-3.3-70b"]["times"].append(duration)
            data = json.loads(resp.choices[0].message.content)
            if data.get("is_literature") == sample["label"]:
                results["llama-3.3-70b"]["correct"] += 1
            results["llama-3.3-70b"]["total"] += 1
        except Exception as e:
            print(f"Groq error: {e}")

    # Output results
    print("\n" + "="*30)
    print("FINAL BENCHMARK RESULTS")
    print("="*30)
    for model, data in results.items():
        acc = (data["correct"] / data["total"]) * 100 if data["total"] > 0 else 0
        avg_time = sum(data["times"]) / len(data["times"]) if data["times"] else 0
        print(f"Model: {model}")
        print(f" - Accuracy: {acc:.1f}% ({data['correct']}/{data['total']})")
        print(f" - Avg Latency: {avg_time:.2f}s")
        print("-" * 20)

if __name__ == "__main__":
    benchmark_models()
