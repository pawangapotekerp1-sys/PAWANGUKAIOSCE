const fs = require('fs');
let content = fs.readFileSync('src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx', 'utf-8');

// Update router
content = content.replace(/initialEntry = \"\/scheduled-ops\/events\/new\"/g, 'initialEntry = \"/scheduled-ops/events/event-1/questions\"');
content = content.replace(/<Route path=\"\/scheduled-ops\/events\/new\" element={<ScheduledEventEditorPage \/>} \/>/, '<Route path=\"/scheduled-ops/events/:id/questions\" element={<ScheduledEventEditorPage />} />');
content = content.replace(/<Route path=\"\/scheduled-ops\/events\/:eventId\/edit\" element={<ScheduledEventEditorPage \/>} \/>/g, '');

// Update labels
content = content.replace(/kelola event terjadwal/ig, 'manajemen soal event terjadwal');
content = content.replace(/expect\(screen\.getByText\(\/mulai dari identitas event, lalu tentukan status tayang dan jadwal aksesnya\/i\)\)\.toBeInTheDocument\(\);/g, '');
content = content.replace(/expect\(await screen\.findByLabelText\(\/judul event\/i\)\);/g, '');
content = content.replace(/await screen\.findByLabelText\(\/judul event\/i\);/g, '');
content = content.replace(/fireEvent\.change\(screen\.getByLabelText\(\/judul event\/i\), {[^}]*}\);/g, '');

// Remove fresh=1 test completely
const freshTestStart = content.indexOf('test("starts a clean new event');
if (freshTestStart !== -1) {
  const freshTestEnd = content.indexOf('test("loads existing event questions in edit mode"');
  content = content.substring(0, freshTestStart) + content.substring(freshTestEnd);
}

// Replace \"/scheduled-ops/events/event-9/edit\" with questions
content = content.replace(/\/scheduled-ops\/events\/event-9\/edit/g, '/scheduled-ops/events/event-9/questions');

// Remove formState fields title, description, accessStartAt, accessEndAt from draft payload JSONs
content = content.replace(/title:\s*"[^"]*",\s*description:\s*"[^"]*",/g, '');
content = content.replace(/accessStartAt:\s*"[^"]*",\s*accessEndAt:\s*"[^"]*",/g, '');

// Remove expect that checked for title
content = content.replace(/expect\(await screen\.findByDisplayValue\(\/to klinik[^\/]*\/i\)\)\.toBeInTheDocument\(\);/g, '');
content = content.replace(/expect\(screen\.getByDisplayValue\(\/simulasi event klinik\/i\)\)\.toBeInTheDocument\(\);/g, '');
content = content.replace(/expect\(screen\.queryByDisplayValue\(\/to klinik[^\/]*\/i\)\)\.not\.toBeInTheDocument\(\);/g, '');

fs.writeFileSync('src/pages/scheduled-ops/scheduled-event-editor-page.test.tsx', content);
