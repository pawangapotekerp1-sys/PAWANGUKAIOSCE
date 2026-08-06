# AI OSCE Simulator Platform Design (Pawang Masuk Apoteker)

## 1. Overview
A dynamic, AI-powered platform for simulating Objective Structured Clinical Examinations (OSCE) specifically tailored for Pharmacists (Apoteker). The platform supports live generative AI roleplay for clinical communication stations and interactive documentation/compounding modules for non-verbal stations. It is powered by an AI-assisted station builder that bridges traditional OSCE documentation with digital simulation.

## 2. Architecture & Components

### A. Student Experience: Modular UI Workspace
A single, highly adaptive layout that renders different widgets based on a JSON configuration generated for each specific station.

*   **Static Framework:** Station Timer (e.g., 1 min reading, 7 min execution), Candidate Instructions/Brief, and Submit Button.
*   **Widget A (Live Voice AI):** Real-time audio visualizer for bidirectional communication. Features interruptibility (barge-in support) and is persona-driven (AI acts as Patient, Doctor, or Nurse).
*   **Widget B (Clinical Attachments):** Dynamic tabs displaying digital Prescriptions (Resep), Lab Results, or Patient Medical Records.
*   **Widget C (Interactive Forms & Sequencing):** For non-interview stations. Features digital templates (Surat Pesanan, Copy Resep, Patient Medication Record) and logical sequencing UI for compounding/farmasetika stations (e.g., calculations, etiquette making).

### B. Mentor Experience: Hybrid Station Builder
A Station Builder designed to dramatically reduce creation time while enforcing clinical accuracy through Human-in-the-Loop validation.

*   **Input Mode 1 (AI Generative / Prompt-to-Station):** Mentors provide a short prompt (e.g., "Hypertension counseling with ACE Inhibitor DRP"). AI generates the station (scenario, persona, rubric) heavily restricted by RAG and pre-approved clinical blueprints.
*   **Input Mode 2 (Document Extraction / File-to-Station):** Mentors upload existing Word/PDF OSCE files. AI acts purely as a parser, converting text into a digital station JSON (extracting the rubric into a checklist, the scenario into instructions, and the actor guidelines into an AI system prompt).
*   **Manual Editor Mode:** Regardless of the AI input method, the output is always a "Draft". Mentors must review the drafted station, modify rubric weights if necessary, and explicitly publish it.

### C. Evaluation & Feedback Engine
*   **Real-time Rubric Matching:** The AI evaluator observes the student's actions (speech transcripts or submitted digital forms) and maps them to the Kemenkes/Kolegium standard rubric.
*   **Timeline Transcript:** Provides a timestamped transcript highlighting exactly where the student scored or missed points (e.g., "🟢 01:15 - Checked drug allergies - [+2 points]").

## 3. Data Flow
1. **Creation:** Mentor Input (Prompt/File Upload) -> AI Generator/Extractor -> JSON Station Config -> Manual Editor Review -> Database.
2. **Execution:** JSON Station Config -> Renders Modular UI -> Student Interacts (Voice/Forms) -> Activity Logs & Transcript Sent to AI Evaluator.
3. **Feedback:** AI Evaluator -> Generates Scored Rubric & Timestamped Transcript -> Student Performance Dashboard.

## 4. Anti-Hallucination Guardrails
To prevent dangerous clinical hallucinations in AI-generated content:
*   **Retrieval-Augmented Generation (RAG):** AI references validated clinical guidelines/Pionas before generating scenarios.
*   **Pre-Approved Case Blueprints:** AI generation is based on verified foundational case templates (Bank Kasus Dasar).
*   **Strict JSON Schemas:** Forces AI output into a rigid structure, rejecting non-standard drugs or formats.
*   **Human-in-the-Loop:** All AI-generated/extracted content remains unpublished until manually verified and approved by the mentor.
