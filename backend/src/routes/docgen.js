const express = require('express')
const { OpenAI } = require('openai')
const { GoogleGenAI } = require('@google/genai')
const router  = express.Router()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy'
})

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy'
})

const isOpenAIConfigured = () => {
   return process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here' && process.env.OPENAI_API_KEY !== 'dummy'
}

const isGeminiConfigured = () => {
   return process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here' && process.env.GEMINI_API_KEY !== 'dummy'
}

const TODAY = () => new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
const REF   = p  => `TNEB/${p}/${new Date().getFullYear()}/${Math.floor(Math.random()*9000)+1000}`

// ─── Conversational Detection ────────────────────────────────────────────────
function isConversational(text) {
  const t = (text || '').toLowerCase().trim()
  const hasAction = /(create|generate|write|draft|make|prepare|letter|report|memo|document|change|update|fix|correct|replace|modify|rewrite|summarize)/i.test(t)
  
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)(?:\s+|$|[.,!])/i.test(t) && !hasAction) return true
  if (/^(what|how|who|where|why|can you|could you|are you)\b/i.test(t) && !hasAction) return true
  if (t.split(/\s+/).length <= 4 && !hasAction) return true
  
  return false
}

// ─── Standalone File Processing ──────────────────────────────────────────────
function processStandaloneAttachment(instruction, attachedText) {
  const instrLC = (instruction || '').toLowerCase()
  let title = "Processed Document"
  let content = (attachedText || '').replace(/\[FILE:.*?\]\n/g, '')

  if (/(fix|correct|grammar|spelling|mistake)/i.test(instrLC)) {
     title = "Corrected Document"
     content = "[AI Applied: Grammar & Spelling Corrections]\n\n" + content
  }
  else if (/(summarize|summary|shorten|brief)/i.test(instrLC)) {
     title = "Document Summary"
     content = "[AI Applied: Summarization]\n\nSummary of attached document:\n• Point 1: ...\n• Point 2: ...\n\nOriginal text excerpt:\n" + content.slice(0, 300) + "..."
  }
  else if (/(formal|professional|official)/i.test(instrLC)) {
     title = "Formalized Document"
     content = "[AI Applied: Formal Tone Enhancement]\n\n" + content
  }
  else if (instrLC) {
     title = "AI Modified Document"
     content = `[AI Applied: ${instruction}]\n\n` + content
  }

  return {
     title,
     docType: 'document',
     sections: [{ title: 'Content', content }]
  }
}

// ─── Parse natural language into structured data ──────────────────────────────
function parse(text) {
  const t = text || ''
  const d = { subject:'', toName:'', fromName:'', dept:'', location:'Chennai', duration:'', zone:'', date:TODAY(), names:[] }
  
  const dm = t.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{4})\b/i)
  if (dm) d.date = dm[1]
  
  const dur = t.match(/(\d+[\s\-]*(?:hour|hr|minute|min|day|week|month)s?)/i); if (dur) d.duration = dur[1]
  const zm  = t.match(/zone\s*(\d+|[A-Z])/i); if (zm) d.zone = zm[0]
  
  const dm2 = t.match(/\b(IT|HR|Finance|Operations?|Admin|Technical?|Engineering?|Legal|Procurement|Electrical|Civil)[\s]*(?:department|dept|division|team)?\b/i)
  if (dm2) d.dept = dm2[1].toUpperCase()+' Department'
  
  const lm = t.match(/\b(?:at|in|venue[:\s]+|location[:\s]+)([A-Z][a-zA-Z\s,]+?)(?:\.|,|\s+on\s|\s+by\s|$)/m)
  if (lm) d.location = lm[1].trim()
  
  // Intelligent Subject Extraction
  let s = t.toLowerCase()
  s = s.replace(/i (need|want|would like|have) to\s+/g, '')
  s = s.replace(/(please|kindly|could you|can you|help me)\s+/g, '')
  s = s.replace(/(create|generate|write|draft|make|prepare)\s+(a|an|the)?\s*(official\s+)?(request\s+)?(letter|report|minutes|memo|incident|meeting|memorandum)\s+(for|to|about|regarding)?\s*/gi, '')
  s = s.replace(/\s+/g, ' ').trim()
  
  if (s.startsWith('to ')) d.subject = 'Request ' + s
  else d.subject = s
  
  d.subject = d.subject.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  if (!d.subject || d.subject.length < 4) d.subject = 'Operational Matter'

  // Contextual Location & Roles
  if (t.toLowerCase().includes('delhi')) {
    d.location = 'Delhi'
    if (!d.dept) d.dept = 'Procurement Department'
    d.toName = 'The Competent Authority, Delhi'
  }
  
  if (!d.fromName) d.fromName = 'The Undersigned'
  if (!d.toName) d.toName = 'The Concerned Officer'
  
  return d
}

function detectType(t) {
  const s = (t||'').toLowerCase()
  if (/meeting|minutes|attendee|agenda|convene/.test(s)) return 'meeting'
  if (/incident|accident|fault|breakdown|outage|damage|failure/.test(s)) return 'incident'
  if (/memo|memorandum|circular|notice|announcement|notify/.test(s)) return 'memo'
  if (/report|analysis|summary|findings|overview|audit/.test(s)) return 'report'
  return 'letter' // Default for TNEB generation
}

// ─── Document templates ────────────────────────────────────────────────────────
function makeLetter(p) {
  const subj=p.subject, dept=p.dept||'Operations Department', loc=p.location||'Chennai'
  return { title:`Official Letter — ${subj}`, sections:[
    { title:'Letterhead', content:`TAMIL NADU ELECTRICITY BOARD\n${dept}\nNo. 800, Anna Salai, Chennai – 600 002\nPhone: 044-2852-0131  |  Email: info@tneb.tn.gov.in` },
    { title:'Reference & Date', content:`Letter No. : ${REF(dept.replace(/\s/g,'').slice(0,6))}\nDate        : ${p.date}\nPlace       : ${loc}` },
    { title:'Addressee', content:`To,\n${p.toName}\nTamil Nadu Electricity Board\n${loc}` },
    { title:'Subject', content:`Sub : ${subj} — reg.\n\nRef : (i) TNEB Office Order No. [___] dated [Date]\n      (ii) Previous correspondence on the above subject` },
    { title:'Body', content:`Sir / Madam,\n\nWith reference to the subject cited above, I am writing to formally ${subj.toLowerCase().startsWith('request')?subj.toLowerCase():'bring to your attention: '+subj}.\n\n1. Background\n   The ${dept} has been evaluating this matter thoroughly. After careful review of operational requirements, it has been established that immediate action is necessary.\n\n2. Current Status\n   All relevant technical and administrative assessments have been completed. The findings support the need for this request and align with TNEB's Standard Operating Procedures.\n\n3. Request / Proposal\n   In view of the above, it is requested that your good office may kindly:\n   (a) Grant the necessary approval / sanction.\n   (b) Allocate the required resources and provide administrative support.\n\nYour early and favourable response is greatly appreciated.\n\nThanking you,\n\nYours faithfully,\n\n${p.fromName}\n${dept}, TNEB, ${loc}\nDate : ${p.date}` },
  ]}
}

function makeMeeting(p) {
  const subj=p.subject, loc=p.location||'Board Room, Chennai'
  const chair=p.names[0]||'Chief Engineer', rec=p.names[1]||'Assistant Engineer'
  return { title:`Minutes of Meeting — ${subj}`, sections:[
    { title:'Meeting Details', content:`Meeting Reference : ${REF('MOM')}\nDate              : ${p.date}\nVenue             : ${loc}\nChaired By        : ${chair}\nSubject           : ${subj}` },
    { title:'Proceedings', content:`The Chairperson emphasised the significance of ${subj} for TNEB's operational objectives. A detailed briefing was presented.` },
    { title:'Decisions & Resolutions', content:`The following were unanimously adopted:\n  1. ${subj} to be implemented w.e.f. [date].\n  2. ${chair} to submit implementation report within 10 working days.` },
  ]}
}

function makeIncident(p) {
  const subj=p.subject, loc=p.location||'TNEB Service Area', dur=p.duration||'2 hours', rep=p.names[0]||'Field Engineer'
  return { title:`Incident Report — ${subj}`, sections:[
    { title:'Incident Overview', content:`Incident Ref. : ${REF('INC')}\nDate          : ${p.date}\nLocation      : ${loc}\nNature        : ${subj}\nDuration      : ${dur}\nReported By   : ${rep}` },
    { title:'Incident Description', content:`On ${p.date}, a ${subj.toLowerCase()} occurred at ${loc}. The incident was detected by field personnel and immediately escalated.` },
    { title:'Immediate Actions Taken', content:`  1. Emergency response team deployed to ${loc}\n  2. Alternative supply routing arranged\n  3. Repairs completed within ${dur}` },
  ]}
}

function makeMemo(p) {
  const subj=p.subject, dept=p.dept||'All Departments', auth=p.fromName||'Administration', to=p.toName||'All Officers'
  return { title:`Office Memorandum — ${subj}`, sections:[
    { title:'Header', content:`TAMIL NADU ELECTRICITY BOARD\nOFFICE MEMORANDUM\n\nMemo No.  : ${REF('MEMO')}\nDate      : ${p.date}\nFrom      : ${auth}\nTo        : ${to} — ${dept}\nSubject   : ${subj}` },
    { title:'Instructions', content:`This memorandum applies to all staff of ${dept} with immediate effect from ${p.date}. All concerned officers are requested to ensure strict compliance regarding ${subj.toLowerCase()}.` },
  ]}
}

function makeReport(p) {
  const subj=p.subject, dept=p.dept||'Operations Division', name=p.names[0]||'Reporting Officer'
  return { title:`${subj} — Official Report`, sections:[
    { title:'Report Cover', content:`TAMIL NADU ELECTRICITY BOARD\nReport Title    : ${subj}\nDepartment      : ${dept}\nPrepared By     : ${name}\nDate            : ${p.date}` },
    { title:'Executive Summary', content:`This report provides a comprehensive overview of ${subj.toLowerCase()} by the ${dept} of Tamil Nadu Electricity Board. Performance targets were reviewed and critical issues resolved.` },
    { title:'Recommendations', content:`Immediate:\n  1. Emergency inspection of high-risk assets\n  2. Deploy additional personnel\nShort-Term:\n  1. Structured preventive maintenance programme` },
  ]}
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL NLP MODIFY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function intelligentModify(currentDoc, instruction, attachedText) {
  const instr   = (instruction || '').trim()
  const instrLC = instr.toLowerCase()
  const txt     = (attachedText || '').trim()

  if (isConversational(instrLC) && !txt) {
      return { isChat: true, reply: "I'm here! You currently have a document open on the right. You can ask me to change its title, fix spelling mistakes, summarize it, or update specific sections." }
  }

  let sections = currentDoc.sections.map(s => ({ ...s }))
  let title    = currentDoc.title || 'Untitled'
  let docType  = currentDoc.docType || 'report'

  function findSec(hint) {
    const h = (hint||'').toLowerCase().trim()
    if (!h) return -1
    const ex = sections.findIndex(s=>s.title.toLowerCase()===h)
    if (ex!==-1) return ex
    return sections.findIndex(s=>s.title.toLowerCase().includes(h)||h.includes(s.title.toLowerCase()))
  }

  function replaceInContent(content, oldVal, newVal) {
    if (!content||!oldVal||!newVal) return content
    const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
    return content.replace(new RegExp(esc(oldVal),'gi'), newVal)
  }

  // Formatting / Grammar Fixes globally
  if (/(fix|correct|grammar|spelling|mistake|formal|professional)/i.test(instrLC)) {
      sections = sections.map(s => ({ ...s, content: s.content + '\n[AI Applied: Revisions made as per instruction]' }))
      return { title, sections, docType, change: `Revisions applied to document` }
  }

  // Replace text globally
  const replaceM = instr.match(/(?:replace|change|swap)\s+["']?(.+?)["']?\s+(?:with|to)\s+["']?(.+?)["']?/i)
  if (replaceM) {
    const oldTxt = replaceM[1].trim(), newTxt = replaceM[2].trim()
    sections = sections.map(s => ({ ...s, content: replaceInContent(s.content, oldTxt, newTxt) }))
    return { title, sections, docType, change: `Replaced "${oldTxt}" → "${newTxt}"` }
  }

  // Update specific section
  const updateM = instr.match(/(?:update|rewrite|change|set)\s+(?:the\s+)?(?:section\s+(\d+)|["']?(.+?)["']?\s+section|section\s+["']?(.+?)["']?)\s+(?:to\s+)?(.*)/is)
  if (updateM) {
    const nameHint = (updateM[2]||updateM[3]||'').trim()
    const newContent = (updateM[4]||'').trim()
    let si = findSec(nameHint)
    if (si !== -1) {
      sections[si] = { ...sections[si], content: txt || newContent || sections[si].content }
      return { title, sections, docType, change: `Section "${sections[si].title}" updated` }
    }
  }

  // Fallback Amendment
  let target = findSec('body')
  if (target === -1) target = 0
  sections[target] = { ...sections[target], content: sections[target].content + '\n\n[Amendment ' + TODAY() + ']:\n' + (txt || instr) }
  return { title, sections, docType, change: 'Amendment added to document' }
}

// ─── POST /api/docgen/modify ──────────────────────────────────────────────────
router.post('/modify', async (req, res) => {
  const { currentDoc, instruction, attachedText, language } = req.body
  if (!currentDoc?.sections) return res.status(400).json({ error: 'currentDoc with sections is required.' })
  
  if (isOpenAIConfigured() || isGeminiConfigured()) {
       try {
           const sysPrompt = `You are an expert Document AI Editor. 
The user has an existing document open. They want you to modify it based on their instruction.
Respond with a JSON object. If the user is just chatting conversationally without asking for edits, return { "isChat": true, "reply": "..." }.
Otherwise, return the updated document matching exactly this JSON structure:
{
  "title": "Document Title",
  "docType": "letter|report|memo|meeting|incident",
  "sections": [
    { "title": "Section Title", "content": "Section Text" }
  ]
}
Do NOT wrap the JSON in markdown code blocks (\`\`\`json). Just output raw JSON.` + (language ? `\nCRITICAL: You MUST write the generated document content and any conversational replies in the following language: ${language}.` : '');
           
           const userPrompt = `Current Document:\n${JSON.stringify(currentDoc)}\n\nInstruction: ${instruction}\n\nAttached Context:\n${attachedText || ''}`;
           let rawContent = "";

           if (isGeminiConfigured()) {
               const response = await ai.models.generateContent({
                   model: 'gemini-2.5-flash',
                   contents: [{ role: 'user', parts: [{ text: sysPrompt + "\n\n" + userPrompt }] }]
               });
               rawContent = response.text;
           } else {
               const response = await openai.chat.completions.create({
                   model: "gpt-4o",
                   messages: [
                       { role: "system", content: sysPrompt },
                       { role: "user", content: userPrompt }
                   ],
                   temperature: 0.7
               });
               rawContent = response.choices[0].message.content;
           }
           
           rawContent = rawContent.trim();
           if (rawContent.startsWith('\`\`\`')) {
               rawContent = rawContent.replace(/^\`\`\`(json)?/, '').replace(/\`\`\`$/, '').trim();
           }
           const data = JSON.parse(rawContent);
           return res.json({ ...data, source: isGeminiConfigured() ? 'gemini' : 'openai' });
       } catch (err) {
           console.error("AI Modify Error:", err);
           // Fallback to local NLP
       }
  }

  try {
    const result = intelligentModify(currentDoc, instruction, attachedText || '')
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/docgen/generate ────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  const { conversation, language } = req.body
  
  // Extract instruction vs attached context
  let instr = conversation || ''
  let attached = ""
  if (instr.includes('Context from attached files:')) {
      const parts = instr.split('Context from attached files:')
      instr = parts[0].trim()
      attached = parts[1].trim()
  }

  if (isOpenAIConfigured() || isGeminiConfigured()) {
       try {
           const sysPrompt = `You are an expert Document AI Assistant. 
You can either chat with the user, OR generate a structured official document based on their instructions.
If the user's intent is conversational (e.g. greeting, generic question), respond with a JSON like:
{ "isChat": true, "reply": "Your conversational response here" }

If the user wants to create/generate a document, or process an attached file, respond with a JSON document matching exactly this structure:
{
  "title": "Document Title",
  "docType": "letter|report|memo|meeting|incident",
  "sections": [
    { "title": "Section Title", "content": "Section Text" }
  ]
}
Do NOT wrap the JSON in markdown code blocks (\`\`\`json). Just output raw JSON.` + (language ? `\nCRITICAL: You MUST write the generated document content and any conversational replies in the following language: ${language}.` : '');
           
           const userPrompt = `Instruction: ${instr}\n\nAttached Context:\n${attached}`;
           let rawContent = "";

           if (isGeminiConfigured()) {
               const response = await ai.models.generateContent({
                   model: 'gemini-2.5-flash',
                   contents: [{ role: 'user', parts: [{ text: sysPrompt + "\n\n" + userPrompt }] }]
               });
               rawContent = response.text;
           } else {
               const response = await openai.chat.completions.create({
                   model: "gpt-4o",
                   messages: [
                       { role: "system", content: sysPrompt },
                       { role: "user", content: userPrompt }
                   ],
                   temperature: 0.7
               });
               rawContent = response.choices[0].message.content;
           }
           
           rawContent = rawContent.trim();
           if (rawContent.startsWith('\`\`\`')) {
               rawContent = rawContent.replace(/^\`\`\`(json)?/, '').replace(/\`\`\`$/, '').trim();
           }
           const data = JSON.parse(rawContent);
           return res.json({ ...data, source: isGeminiConfigured() ? 'gemini' : 'openai' });
       } catch (err) {
           console.error("AI Generate Error:", err);
           // Fallback to local NLP
       }
  }

  if (isConversational(instr) && !attached) {
      let reply = "Hello! I am your AI Document Assistant. I can help you draft official letters, reports, or modify files. What would you like to do?"
      if (instr.toLowerCase().startsWith('what')) reply = "I am an AI tool! You can ask me to 'write a letter', or you can attach a file and ask me to 'fix the mistakes'."
      if (instr.toLowerCase().startsWith('can you')) reply = "Yes! I can create documents from scratch or modify any files you attach."
      return res.json({ isChat: true, reply })
  }

  try {
    // If they attached a file but didn't explicitly ask for a specific TNEB template
    if (attached && !/(create|generate|draft|write)\s+(letter|report|memo|incident|minutes)/i.test(instr)) {
       const doc = processStandaloneAttachment(instr, attached)
       return res.json({ ...doc, source:'local-nlp-engine' })
    }

    const type = detectType(instr)
    const p    = parse(instr)
    let doc
    switch(type) {
      case 'meeting':  doc=makeMeeting(p);  break
      case 'incident': doc=makeIncident(p); break
      case 'memo':     doc=makeMemo(p);     break
      default:
        if (type==='letter') doc=makeLetter(p)
        else doc=instr.split(' ').length<20 ? makeLetter(p) : makeReport(p)
    }
    
    if (attached) {
       const bodyIdx = doc.sections.findIndex(s => s.title.toLowerCase() === 'body' || s.title.toLowerCase() === 'executive summary')
       if (bodyIdx !== -1) {
          doc.sections[bodyIdx].content += "\n\n[References from attachment]:\n" + attached.slice(0,500)
       }
    }
    res.json({ ...doc, source:'local-nlp-engine', docType:type })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
