const express = require('express');
const { OpenAI } = require('openai');
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy'
});

// POST /api/ai/modify
router.post('/modify', async (req, res) => {
  try {
    const { text, instruction, language } = req.body;
    
    if (!text || !instruction) {
      return res.status(400).json({ error: 'Missing text or instruction' });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
       return res.json({ result: `[MOCK AI - No API Key]\nInstruction applied: ${instruction}\n\nProcessed Text:\n${text}` });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert AI document editor. Apply the user instruction to the given text and return ONLY the modified text, keeping the original meaning intact.' + (language ? `\nCRITICAL: You MUST write the modified document content in the following language: ${language}.` : '') },
        { role: 'user', content: `Instruction: ${instruction}\n\nText:\n${text}` }
      ],
      temperature: 0.7,
    });

    res.json({ result: response.choices[0].message.content });
  } catch (error) {
    console.error('AI Modification error:', error);
    res.status(500).json({ error: 'AI modification failed' });
  }
});

module.exports = router;
