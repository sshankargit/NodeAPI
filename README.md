# QE CI/CD Sample API with Closed-loop Ollama AI Gates

## What is new

Gate 1 now performs a closed-loop AI workflow:

```text
API specification
→ Ollama generates Jest/Supertest tests
→ Jest executes generated tests
→ If tests fail, failure log is sent back to Ollama
→ Ollama repairs the generated test file
→ Jest reruns the repaired tests once
→ Gate passes or blocks deployment
```

Gate 5 uses Ollama to analyze logs and recommend a solution.

## Prerequisites

```bash
ollama pull llama3.1
ollama list
```

## Run

```bash
npm install
npm run init-db
npm run pipeline:local
```

## Key files

```text
ai/gate1_closed_loop.js
ai/gate1_generate_tests_prompt.txt
ai/gate1_repair_tests_prompt.txt
ai/rca_ollama.js
tests/ai_generated_api.test.js
validation/reports/gate1_closed_loop_metrics.json
validation/reports/gate5_ollama_rca_report.md
```
