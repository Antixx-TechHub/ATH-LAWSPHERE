/**
 * Smart Suggestions API
 * Provides AI-powered legal suggestions based on context
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

// Types of suggestions
type SuggestionType = 
  | 'SECTION_REFERENCE'      // Relevant legal sections
  | 'CASE_PRECEDENT'         // Similar cases
  | 'TEMPLATE'               // Document templates
  | 'NEXT_STEP'              // Procedural next steps
  | 'DEADLINE'               // Important deadlines
  | 'RISK_ALERT'             // Potential risks
  | 'ARGUMENT_POINT';        // Legal arguments

interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  relevance: number;         // 0-100 score
  action?: {
    type: 'link' | 'copy' | 'apply' | 'navigate';
    payload: string;
  };
  source?: string;
  metadata?: Record<string, any>;
}

// Legal domain rules for suggestions
const DOMAIN_RULES: Record<string, { sections: string[]; procedures: string[] }> = {
  criminal: {
    sections: ['IPC Section 302', 'IPC Section 420', 'IPC Section 376', 'CrPC Section 154', 'CrPC Section 164'],
    procedures: ['File FIR', 'Obtain Bail', 'Charge Sheet Filing', 'Trial Proceedings', 'Appeal in High Court']
  },
  civil: {
    sections: ['CPC Order VII Rule 11', 'CPC Section 9', 'CPC Order XXXIX Rule 1 & 2', 'Specific Relief Act'],
    procedures: ['Filing of Suit', 'Written Statement', 'Issues Framing', 'Evidence', 'Arguments', 'Decree']
  },
  family: {
    sections: ['Hindu Marriage Act Section 13', 'Section 125 CrPC', 'Guardianship Act', 'Domestic Violence Act'],
    procedures: ['File Petition', 'Mediation', 'Interim Relief', 'Final Hearing']
  },
  constitutional: {
    sections: ['Article 14', 'Article 19', 'Article 21', 'Article 32', 'Article 226'],
    procedures: ['File Writ Petition', 'Interim Relief', 'Counter Affidavit', 'Hearing']
  },
  corporate: {
    sections: ['Companies Act 2013', 'SEBI Act', 'Insolvency Code', 'FEMA'],
    procedures: ['Board Resolution', 'Shareholder Meeting', 'Regulatory Filing', 'Compliance Audit']
  },
  labour: {
    sections: ['Industrial Disputes Act', 'Payment of Wages Act', 'Factories Act', 'ESI Act', 'PF Act'],
    procedures: ['Conciliation', 'Tribunal Filing', 'Industrial Court', 'High Court']
  }
};

// Extract domain from text
function detectDomain(text: string): string[] {
  const domains: string[] = [];
  const textLower = text.toLowerCase();
  
  const domainKeywords: Record<string, string[]> = {
    criminal: ['ipc', 'crpc', 'murder', 'theft', 'assault', 'fir', 'bail', 'charge sheet'],
    civil: ['contract', 'property', 'civil suit', 'damages', 'specific performance', 'injunction'],
    family: ['divorce', 'custody', 'maintenance', 'matrimonial', 'marriage', 'domestic violence'],
    constitutional: ['article', 'fundamental rights', 'writ', 'constitution', 'mandamus'],
    corporate: ['company', 'director', 'shareholder', 'sebi', 'insolvency', 'merger'],
    labour: ['employee', 'wages', 'termination', 'industrial', 'labour', 'workman']
  };
  
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(kw => textLower.includes(kw))) {
      domains.push(domain);
    }
  }
  
  return domains.length > 0 ? domains : ['civil']; // Default to civil
}

// Generate suggestions based on context
function generateSuggestions(
  context: string,
  domains: string[],
  existingNodes: string[] = []
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let idCounter = 1;
  
  const textLower = context.toLowerCase();
  
  // Section references
  for (const domain of domains) {
    const rules = DOMAIN_RULES[domain];
    if (!rules) continue;
    
    for (const section of rules.sections) {
      // Check if section not already in graph
      if (!existingNodes.some(n => n.toLowerCase().includes(section.toLowerCase()))) {
        // Check relevance to context
        const sectionKeywords = section.toLowerCase().split(' ');
        const relevance = sectionKeywords.filter(kw => 
          textLower.includes(kw) || kw.match(/\d+/)
        ).length / sectionKeywords.length * 100;
        
        if (relevance > 30 || Math.random() > 0.7) { // Some randomness for discovery
          suggestions.push({
            id: `sug_${idCounter++}`,
            type: 'SECTION_REFERENCE',
            title: section,
            description: `Consider adding ${section} to your analysis`,
            relevance: Math.round(relevance) || 50,
            action: {
              type: 'apply',
              payload: section
            },
            source: 'Legal Domain Knowledge'
          });
        }
      }
    }
    
    // Procedural next steps
    for (const procedure of rules.procedures) {
      suggestions.push({
        id: `sug_${idCounter++}`,
        type: 'NEXT_STEP',
        title: procedure,
        description: `Next step in ${domain} matters`,
        relevance: 60,
        action: {
          type: 'copy',
          payload: procedure
        }
      });
    }
  }
  
  // Risk alerts based on keywords
  const riskPatterns = [
    { pattern: 'limitation', alert: 'Check limitation period - may expire soon', relevance: 90 },
    { pattern: 'deadline', alert: 'Ensure all deadlines are calendared', relevance: 85 },
    { pattern: 'ex-parte', alert: 'Ex-parte proceedings - ensure proper notice', relevance: 80 },
    { pattern: 'appeal', alert: 'Check appeal limitation - typically 30-90 days', relevance: 75 },
    { pattern: 'interim', alert: 'Consider interim relief application', relevance: 70 }
  ];
  
  for (const risk of riskPatterns) {
    if (textLower.includes(risk.pattern)) {
      suggestions.push({
        id: `sug_${idCounter++}`,
        type: 'RISK_ALERT',
        title: 'Risk Alert',
        description: risk.alert,
        relevance: risk.relevance,
        metadata: { trigger: risk.pattern }
      });
    }
  }
  
  // Template suggestions
  const templates = [
    { name: 'Legal Notice Template', pattern: 'notice' },
    { name: 'Reply to Legal Notice', pattern: 'reply' },
    { name: 'Petition Draft', pattern: 'petition' },
    { name: 'Affidavit Format', pattern: 'affidavit' },
    { name: 'Written Statement', pattern: 'written statement' }
  ];
  
  for (const template of templates) {
    if (textLower.includes(template.pattern)) {
      suggestions.push({
        id: `sug_${idCounter++}`,
        type: 'TEMPLATE',
        title: template.name,
        description: `Standard template for ${template.pattern}`,
        relevance: 65,
        action: {
          type: 'navigate',
          payload: `/templates/${template.pattern.replace(' ', '-')}`
        }
      });
    }
  }
  
  // Sort by relevance
  suggestions.sort((a, b) => b.relevance - a.relevance);
  
  // Return top 10
  return suggestions.slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const graphId = searchParams.get('graphId');
    const context = searchParams.get('context') || '';
    
    let existingNodes: string[] = [];
    
    // Get existing nodes from graph if graphId provided
    if (graphId) {
      const graph = await prisma.knowledgeGraph.findFirst({
        where: {
          id: graphId,
          userId: session.user.id
        }
      });
      
      if (graph?.data) {
        const graphData = typeof graph.data === 'string' 
          ? JSON.parse(graph.data) 
          : graph.data;
        existingNodes = graphData.nodes?.map((n: any) => n.label || '') || [];
      }
    }
    
    // Detect domains from context
    const domains = detectDomain(context);
    
    // Generate suggestions
    const suggestions = generateSuggestions(context, domains, existingNodes);
    
    return NextResponse.json({
      success: true,
      domains,
      suggestions,
      total: suggestions.length
    });
    
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, suggestionId, graphId, feedback } = body;
    
    if (action === 'accept') {
      // Log that user accepted a suggestion
      await prisma.legalSuggestion.create({
        data: {
          graphId,
          type: 'SECTION_REFERENCE',
          title: body.title || 'Accepted Suggestion',
          content: body.content || '',
          relevance: body.relevance || 50,
          source: body.source || 'AI',
          accepted: true,
          userId: session.user.id
        }
      });
      
      return NextResponse.json({ success: true, action: 'accepted' });
    }
    
    if (action === 'dismiss') {
      // Log dismissed suggestion for learning
      await prisma.legalSuggestion.create({
        data: {
          graphId,
          type: 'SECTION_REFERENCE',
          title: body.title || 'Dismissed Suggestion',
          content: body.content || '',
          relevance: body.relevance || 50,
          source: body.source || 'AI',
          dismissed: true,
          dismissReason: feedback || '',
          userId: session.user.id
        }
      });
      
      return NextResponse.json({ success: true, action: 'dismissed' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Suggestions action error:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
