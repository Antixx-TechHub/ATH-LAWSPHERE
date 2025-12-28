# Lawsphere Legal Research - Test Guide

## 📁 Sample Documents Created

| File | Type | Use Case |
|------|------|----------|
| `01-employment-contract.txt` | Employment Agreement | Labor law, employee rights, compensation analysis |
| `02-rental-agreement.txt` | Leave & License | Property law, tenant rights, Maharashtra Rent Act |
| `03-case-brief-ipc-420.txt` | Criminal Case Brief | IPC sections, fraud cases, criminal procedure |
| `04-legal-memo-gdpr-compliance.txt` | Legal Memo | Data protection, GDPR, IT law compliance |
| `05-nda-agreement.txt` | NDA | Contract law, confidentiality, IP protection |

---

## 🧪 Test Queries by Category

### 1. **Document Analysis Queries**
After uploading documents, test these:

```
Summarize the key terms of this employment contract

What are the termination conditions in this agreement?

Identify any potential legal risks in this contract

What PII (personally identifiable information) is present in this document?

Extract all monetary values and payment terms

List all the articles/sections and their purposes
```

### 2. **Employment Law Queries**
(Use with 01-employment-contract.txt)

```
Is the non-compete clause in this contract enforceable under Indian law?

What are the employee's rights regarding notice period?

Analyze the IP assignment clause - is it valid?

Compare the leave policy with the Shops and Establishments Act requirements

What happens if the employee breaches the confidentiality clause?

Is the 60-day notice period legal in India?
```

### 3. **Property Law Queries**
(Use with 02-rental-agreement.txt)

```
Is this a valid leave and license agreement under Maharashtra law?

What are the landlord's remedies if rent is not paid?

Can the security deposit be forfeited? Under what conditions?

What is the difference between Leave & License and Lease?

What happens after the 11-month period expires?

Is the agreement compliant with Maharashtra Rent Control Act 1999?
```

### 4. **Criminal Law Queries**
(Use with 03-case-brief-ipc-420.txt)

```
What are the essential ingredients of Section 420 IPC?

What is the maximum punishment for cheating under IPC?

How does criminal conspiracy (120B) work in fraud cases?

What evidence is needed to prove forgery under Section 468?

Can this case be compounded or settled out of court?

What defenses are available to the accused in a cheating case?
```

### 5. **Data Protection & GDPR Queries**
(Use with 04-legal-memo-gdpr-compliance.txt)

```
What are the key GDPR requirements for Indian companies?

How do Standard Contractual Clauses (SCCs) work for data transfers?

What is a Data Protection Officer and when is it mandatory?

What are the penalties for GDPR non-compliance?

How should data subject access requests be handled?

What security measures are required under Article 32?
```

### 6. **Contract Law Queries**
(Use with 05-nda-agreement.txt)

```
Is this NDA mutual or one-way?

What information is excluded from confidentiality?

What happens if there's a breach of this NDA?

How long do the confidentiality obligations last?

Can this NDA be assigned to another party?

What are the remedies available for breach?
```

---

## 🔍 General Legal Research Queries (No Document Required)

### Indian Law Queries
```
What is the limitation period for filing a civil suit in India?

Explain the difference between cognizable and non-cognizable offenses

What are the grounds for divorce under Hindu Marriage Act?

How does Section 138 of Negotiable Instruments Act work for cheque bounce?

What is anticipatory bail and when can it be filed?

Explain the RERA Act and its applicability to homebuyers

What are the rights of a tenant under Indian law?
```

### Corporate Law Queries
```
What is the procedure to incorporate a private limited company in India?

What are the annual compliance requirements for a private company?

Explain the concept of corporate veil and when it can be pierced

What are the duties of directors under Companies Act 2013?

What is the difference between amalgamation and merger?
```

### Real-Time Information Queries (Tests External Tools)
```
What is the current GST rate for IT services?

What are the latest changes to labor laws in India?

When is the next date for filing GST returns?

What is today's date and time?

Calculate 18% GST on 50000 rupees
```

---

## 🎯 Efficiency Testing Scenarios

### Scenario 1: Contract Review
1. Upload `01-employment-contract.txt`
2. Ask: "Review this contract and identify any clauses that may be unfavorable to the employee"
3. Follow up: "What changes would you recommend?"

### Scenario 2: Case Analysis
1. Upload `03-case-brief-ipc-420.txt`
2. Ask: "If I were the defense lawyer, what arguments could I make?"
3. Follow up: "What precedents support the prosecution's case?"

### Scenario 3: Compliance Check
1. Upload `04-legal-memo-gdpr-compliance.txt`
2. Ask: "Create a compliance checklist from this memo"
3. Follow up: "What are the immediate priority actions?"

### Scenario 4: Multi-Document Analysis
1. Upload `05-nda-agreement.txt` and `01-employment-contract.txt`
2. Ask: "Compare the confidentiality clauses in both documents"
3. Ask: "Which has stronger IP protection?"

---

## 📊 Expected AI Capabilities

| Feature | Status | Notes |
|---------|--------|-------|
| Document Upload | ✅ Ready | PDF, DOCX, TXT supported |
| Text Extraction | ✅ Ready | Uses PyPDF2, python-docx |
| Privacy Scanning | ✅ Ready | Detects PII (Aadhaar, PAN, etc.) |
| Legal Research Chat | ✅ Ready | Uses local Ollama qwen2.5 |
| External Tools | ✅ Ready | Weather, DateTime, Calculate |
| Case Law Search | 🔄 Planned | Needs legal DB integration |
| Statute Search | 🔄 Planned | Needs legal DB integration |

---

## 🚀 How to Test

### Step 1: Start the Server
```bash
cd apps/ai-service
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 2: Access the Web App
```
http://localhost:3000
```

### Step 3: Upload Documents
- Go to Dashboard → Files
- Upload sample documents from `test-samples/` folder
- Wait for processing (text extraction + privacy scan)

### Step 4: Start Chat
- Go to Dashboard → Chat
- Select an uploaded document (optional)
- Try the queries from this guide

### Step 5: Check Trust Badges
- 🏠 LOCAL = Using Ollama (qwen2.5-14b)
- 🏠 LOCAL + 🔧 TOOLS = Local LLM + external APIs
- ☁️ CLOUD = Using cloud LLM (if configured)

---

## 📝 Metrics to Track

1. **Response Time**: Should be under 10 seconds for most queries
2. **Accuracy**: Legal concepts should be correctly explained
3. **Relevance**: Responses should address the specific query
4. **Citation**: Should reference relevant laws/sections when applicable
5. **Trust Badge**: Should correctly show local vs. cloud processing

---

## 🐛 Known Limitations

1. **No Real Case Law DB**: Search for specific cases returns mock data
2. **No Statute DB**: Cannot search live legislation databases
3. **File Size**: Large PDFs may take longer to process
4. **Complex Queries**: Very nuanced legal questions may need multiple follow-ups

---

## 📧 Feedback

Document any issues or suggestions for improvement:
- Response accuracy problems
- Missing legal concepts
- UI/UX issues
- Performance concerns

---

*Test Guide Created: December 29, 2024*
*For: Lawsphere Legal-Tech AI Platform*
