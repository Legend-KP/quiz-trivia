# 📝 Weekly Quiz Update Guide

This guide shows you how to prepare and update questions for each weekly quiz (Tuesday & Friday).

---

## 📍 Location: `src/lib/weeklyQuiz.ts`

All quiz questions are located in the `getCurrentWeeklyQuiz()` function, starting around **line 84**.

---

## 🔄 Update Process (Step-by-Step)

### **Step 1: Update the Topic**
Find line 88 and update the topic:

```typescript
topic: "Your New Topic Here", // Update this topic for each quiz
```

**Example Topics:**
- "DeFi Protocols"
- "Layer 2 Scaling Solutions"
- "NFT Standards & Use Cases"
- "Ethereum Improvement Proposals (EIPs)"
- "DAO Governance"
- "Web3 Security Best Practices"
- "Tokenomics Fundamentals"
- "Zero-Knowledge Proofs"
- "Cross-Chain Bridges"
- "Staking & Validation"

---

### **Step 2: Update Questions Array**
Replace the `questions` array (lines 91-172) with your new questions.

---

## 📋 Question Format Template

Each question follows this exact format:

```typescript
{
  id: 1,                                           // Question number (1-10)
  question: "Your question text here?",            // The question
  options: [                                        // 4 options (array)
    "Option A",
    "Option B", 
    "Option C",
    "Option D"
  ],
  correct: 0,                                      // Index of correct answer (0-3)
                                                   // 0 = first option, 1 = second, etc.
  timeLimit: 45,                                   // Always 45 seconds
  explanation: "Clear explanation of why this answer is correct." // Educational
},
```

---

## ✅ Complete Example

Here's how a complete set of 10 questions looks:

```typescript
questions: [
  {
    id: 1,
    question: "What does TVL stand for in DeFi?",
    options: ["Total Value Locked", "Token Value Limit", "Trading Volume Limit", "Transaction Value Lock"],
    correct: 0,
    timeLimit: 45,
    explanation: "TVL measures the total value of assets locked in DeFi protocols, indicating protocol usage and liquidity."
  },
  {
    id: 2,
    question: "Which DeFi protocol pioneered automated market making?",
    options: ["Compound", "Uniswap", "MakerDAO", "Aave"],
    correct: 1,
    timeLimit: 45,
    explanation: "Uniswap introduced the constant product formula (x*y=k) for automated market making in DeFi."
  },
  // ... continue for questions 3-10
]
```

---

## 🎯 Important Rules

### ✅ **DO:**
- Use exactly **10 questions** per quiz
- Set `timeLimit: 45` for all questions
- Number `id` from **1 to 10**
- Provide **4 options** per question
- Set `correct` to **0, 1, 2, or 3** (index of the correct option)
- Add clear, educational `explanation` text
- Use question marks (?) at the end of questions

### ❌ **DON'T:**
- Don't use more or less than 10 questions
- Don't change `timeLimit` (must be 45)
- Don't use wrong `correct` index (must match option position)
- Don't forget commas between questions
- Don't mix up the option order

---

## 📝 Quick Checklist Before Each Quiz

- [ ] Topic updated (line 88)
- [ ] 10 questions added (lines 91-172)
- [ ] All question IDs numbered 1-10
- [ ] All questions have 4 options
- [ ] `correct` index matches the right answer (0-3)
- [ ] All `timeLimit` set to 45
- [ ] All questions have explanations
- [ ] No syntax errors (check for missing commas, quotes, etc.)

---

## 🚀 How to Prepare Questions (Workflow)

### **Option 1: Prepare in a Text File First**

1. Create a text file: `quiz_questions_[date].txt`
2. Write your questions in this format:

```
Topic: Layer 2 Scaling Solutions

Q1: What is the primary benefit of Layer 2 solutions?
A) Lower transaction costs
B) Higher transaction costs  
C) More centralization
D) Slower transactions
Correct: A (index 0)
Explanation: Layer 2 solutions scale by processing transactions off-chain or in batches, significantly reducing gas fees.

Q2: [Next question...]
```

3. Then convert to the code format above

### **Option 2: Use This Template**

Copy this template and fill it in:

```typescript
topic: "[YOUR TOPIC HERE]",

questions: [
  // Question 1
  {
    id: 1,
    question: "[Question 1 text?]",
    options: ["[Option A]", "[Option B]", "[Option C]", "[Option D]"],
    correct: [0-3],
    timeLimit: 45,
    explanation: "[Why this answer is correct]"
  },
  
  // Question 2
  {
    id: 2,
    question: "[Question 2 text?]",
    options: ["[Option A]", "[Option B]", "[Option C]", "[Option D]"],
    correct: [0-3],
    timeLimit: 45,
    explanation: "[Why this answer is correct]"
  },
  
  // ... Continue for questions 3-10
]
```

---

## ⚠️ Common Mistakes to Avoid

1. **Wrong `correct` index:**
   - ❌ `correct: 1` when answer is the 2nd option (should be `0`)
   - ✅ Remember: Array index starts at 0

2. **Missing commas:**
   - ❌ `{ id: 1, ... }` `{ id: 2, ... }` (missing comma)
   - ✅ `{ id: 1, ... },` `{ id: 2, ... },` (comma after each question)

3. **Wrong number of options:**
   - ❌ Only 3 options provided
   - ✅ Must have exactly 4 options

4. **Syntax errors:**
   - ❌ Missing closing brackets `}`
   - ❌ Unclosed strings (missing quotes)
   - ✅ Use a code editor with syntax highlighting

---

## 🔧 Testing Your Changes

After updating questions:

1. **Save the file** (`src/lib/weeklyQuiz.ts`)
2. **Check for errors:**
   - Look for red underlines in your editor
   - Check terminal/build output for TypeScript errors
3. **Test locally:**
   - Start the quiz in Weekly Quiz mode
   - Verify all 10 questions appear
   - Check that correct answers work
   - Confirm explanations display properly

---

## 📅 Production Schedule Reminder

**Before each quiz:**
- **Tuesday Quiz:** Update questions Monday evening
- **Friday Quiz:** Update questions Thursday evening

**Quiz Times:**
- Start: **6:00 PM UTC** (Tuesday/Friday)
- End: **6:00 AM UTC** (Next day)
- Duration: **12 hours**

---

## 🎓 Question Writing Tips

1. **Clarity:** Make questions clear and unambiguous
2. **Difficulty:** Mix easy, medium, and challenging questions
3. **Balance:** Options should be plausible (not obviously wrong)
4. **Educational:** Explanations should teach something valuable
5. **Relevance:** Match questions to the week's topic theme
6. **Length:** Keep questions and options concise (45 seconds is tight!)

---

## 📞 Need Help?

If you're stuck:
1. Check existing questions in the file for format reference
2. Use a JSON validator to check syntax
3. Test with 1-2 questions first before adding all 10
4. Review this guide again!

---

**Last Updated:** [Current Date]
**File Location:** `src/lib/weeklyQuiz.ts` (lines 84-173)

