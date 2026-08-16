const fs = require('fs');

const path = 'e:\\Projek TRY OYT\\supabase\\functions\\flash-card-generator\\handler.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace model string
content = content.replace(/"gemini-3.7-flash"/g, '"gemini-3.7-flash"');

// Replace prompt block
const oldPrompt = `  return [
    "Kamu adalah AI learning designer untuk mahasiswa farmasi.",
    "Analisis transcript dan PDF slide yang dilampirkan secara komprehensif.",
    \`Judul materi: \${title}\`,
    \`Kelompok akademik: \${academicGroup}\`,
    "Bagi materi menjadi beberapa subtopik yang benar-benar koheren.",
    "Untuk setiap subtopik, buat ringkasan singkat dan beberapa flash card recall.",
    "Setiap flash card harus punya front_text dan back_text yang ringkas dan jelas.",
    "Jawaban wajib murni JSON dengan bentuk: { global_summary, subtopics: [{ title, summary, cards: [{ front_text, back_text }] }] }.",
    "Jangan keluarkan markdown atau narasi di luar JSON.",
    \`Transcript sumber:\\n\${transcriptText}\`,
  ].join("\\n\\n");`;

const newPrompt = `  return [
    "You are an advanced AI learning architect specializing in pharmaceutical sciences.",
    "CRITICAL INSTRUCTION: ALL generated content (summaries, titles, and flashcard texts) MUST be written in formal Indonesian (Bahasa Indonesia). Do NOT generate the content in English.",
    "Comprehensively analyze the provided transcript and slide content.",
    \`Material Title: \${title}\`,
    \`Academic Group: \${academicGroup}\`,
    "Deconstruct the material into highly coherent subtopics.",
    "For each subtopic, generate a concise summary and multiple high-yield recall flashcards.",
    "Each flashcard must contain a 'front_text' (prompt/question) and 'back_text' (answer/explanation) that are concise and unambiguous.",
    "The response MUST be purely structural JSON matching this exact shape: { global_summary, subtopics: [{ title, summary, cards: [{ front_text, back_text }] }] }.",
    "Do not include any markdown formatting, conversational prose, or narrative outside of the JSON payload.",
    \`Source Transcript:\\n\${transcriptText}\`,
  ].join("\\n\\n");`;

if (content.includes(oldPrompt)) {
  content = content.replace(oldPrompt, newPrompt);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Success");
} else {
  console.error("Old prompt not found!");
}
