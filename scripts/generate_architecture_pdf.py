"""
Generate Lawsphere Architecture PDF with visual diagrams
"""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, Flowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.graphics import renderPDF
from datetime import datetime

# Custom flowable for architecture diagrams
class ArchitectureDiagram(Flowable):
    def __init__(self, width, height):
        Flowable.__init__(self)
        self.width = width
        self.height = height
    
    def draw(self):
        # Draw the architecture diagram
        c = self.canv
        
        # Colors
        blue = colors.HexColor('#3182ce')
        green = colors.HexColor('#38a169')
        purple = colors.HexColor('#805ad5')
        orange = colors.HexColor('#dd6b20')
        gray = colors.HexColor('#4a5568')
        light_blue = colors.HexColor('#ebf8ff')
        light_green = colors.HexColor('#f0fff4')
        light_purple = colors.HexColor('#faf5ff')
        
        # Client Layer
        c.setFillColor(colors.HexColor('#e2e8f0'))
        c.roundRect(50, self.height - 60, self.width - 100, 50, 10, fill=1, stroke=0)
        c.setFillColor(gray)
        c.setFont('Helvetica-Bold', 12)
        c.drawCentredString(self.width/2, self.height - 40, "CLIENTS (Browser / Mobile / API)")
        
        # Arrow down
        self._draw_arrow(c, self.width/2, self.height - 70, self.width/2, self.height - 100)
        
        # Frontend Layer
        c.setFillColor(light_blue)
        c.setStrokeColor(blue)
        c.setLineWidth(2)
        c.roundRect(30, self.height - 200, self.width - 60, 90, 10, fill=1, stroke=1)
        c.setFillColor(blue)
        c.setFont('Helvetica-Bold', 14)
        c.drawCentredString(self.width/2, self.height - 120, "FRONTEND - Next.js 14")
        c.setFont('Helvetica', 10)
        c.setFillColor(gray)
        c.drawCentredString(self.width/2, self.height - 140, "localhost:3000")
        
        # Frontend components
        components = ['Auth', 'Dashboard', 'Chat', 'Files']
        comp_width = 80
        start_x = (self.width - (len(components) * comp_width + (len(components)-1) * 20)) / 2
        for i, comp in enumerate(components):
            x = start_x + i * (comp_width + 20)
            c.setFillColor(blue)
            c.roundRect(x, self.height - 190, comp_width, 30, 5, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont('Helvetica-Bold', 9)
            c.drawCentredString(x + comp_width/2, self.height - 180, comp)
        
        # Arrows to services
        c.setStrokeColor(gray)
        c.setLineWidth(1)
        # Left arrow to DB
        self._draw_arrow(c, self.width/4, self.height - 210, self.width/4, self.height - 240)
        # Center arrow to AI
        self._draw_arrow(c, self.width/2, self.height - 210, self.width/2, self.height - 240)
        # Right arrow to Storage
        self._draw_arrow(c, 3*self.width/4, self.height - 210, 3*self.width/4, self.height - 240)
        
        # Service boxes
        box_width = 120
        box_height = 70
        
        # PostgreSQL
        c.setFillColor(light_purple)
        c.setStrokeColor(purple)
        c.setLineWidth(2)
        x = self.width/4 - box_width/2
        c.roundRect(x, self.height - 320, box_width, box_height, 8, fill=1, stroke=1)
        c.setFillColor(purple)
        c.setFont('Helvetica-Bold', 11)
        c.drawCentredString(self.width/4, self.height - 265, "PostgreSQL")
        c.setFont('Helvetica', 9)
        c.setFillColor(gray)
        c.drawCentredString(self.width/4, self.height - 280, "+ pgvector")
        c.drawCentredString(self.width/4, self.height - 295, ":5432")
        
        # AI Service
        c.setFillColor(light_green)
        c.setStrokeColor(green)
        x = self.width/2 - box_width/2
        c.roundRect(x, self.height - 320, box_width, box_height, 8, fill=1, stroke=1)
        c.setFillColor(green)
        c.setFont('Helvetica-Bold', 11)
        c.drawCentredString(self.width/2, self.height - 265, "AI Service")
        c.setFont('Helvetica', 9)
        c.setFillColor(gray)
        c.drawCentredString(self.width/2, self.height - 280, "FastAPI")
        c.drawCentredString(self.width/2, self.height - 295, ":8000")
        
        # MinIO
        c.setFillColor(colors.HexColor('#fffaf0'))
        c.setStrokeColor(orange)
        x = 3*self.width/4 - box_width/2
        c.roundRect(x, self.height - 320, box_width, box_height, 8, fill=1, stroke=1)
        c.setFillColor(orange)
        c.setFont('Helvetica-Bold', 11)
        c.drawCentredString(3*self.width/4, self.height - 265, "MinIO")
        c.setFont('Helvetica', 9)
        c.setFillColor(gray)
        c.drawCentredString(3*self.width/4, self.height - 280, "S3 Storage")
        c.drawCentredString(3*self.width/4, self.height - 295, ":9000")
        
        # Arrow from AI Service down
        self._draw_arrow(c, self.width/2, self.height - 330, self.width/2, self.height - 360)
        
        # LangGraph box
        c.setFillColor(colors.HexColor('#fefcbf'))
        c.setStrokeColor(colors.HexColor('#d69e2e'))
        c.setLineWidth(2)
        c.roundRect(self.width/2 - 70, self.height - 420, 140, 50, 8, fill=1, stroke=1)
        c.setFillColor(colors.HexColor('#744210'))
        c.setFont('Helvetica-Bold', 11)
        c.drawCentredString(self.width/2, self.height - 385, "LangGraph Agent")
        c.setFont('Helvetica', 9)
        c.drawCentredString(self.width/2, self.height - 400, "Orchestration")
        
        # Arrow down to LLM
        self._draw_arrow(c, self.width/2, self.height - 430, self.width/2, self.height - 450)
        
        # LLM Router
        c.setFillColor(colors.HexColor('#fed7d7'))
        c.setStrokeColor(colors.HexColor('#c53030'))
        c.roundRect(50, self.height - 530, self.width - 100, 70, 10, fill=1, stroke=1)
        c.setFillColor(colors.HexColor('#c53030'))
        c.setFont('Helvetica-Bold', 12)
        c.drawCentredString(self.width/2, self.height - 475, "LLM Router")
        
        # LLM Providers
        llms = [('GPT-4o', 'OpenAI'), ('Claude 3', 'Anthropic'), ('Gemini', 'Google')]
        llm_width = 100
        start_x = (self.width - (len(llms) * llm_width + (len(llms)-1) * 30)) / 2
        for i, (name, provider) in enumerate(llms):
            x = start_x + i * (llm_width + 30)
            c.setFillColor(colors.white)
            c.roundRect(x, self.height - 520, llm_width, 35, 5, fill=1, stroke=1)
            c.setFillColor(colors.HexColor('#c53030'))
            c.setFont('Helvetica-Bold', 10)
            c.drawCentredString(x + llm_width/2, self.height - 500, name)
            c.setFont('Helvetica', 8)
            c.setFillColor(gray)
            c.drawCentredString(x + llm_width/2, self.height - 512, provider)
    
    def _draw_arrow(self, c, x1, y1, x2, y2):
        c.setStrokeColor(colors.HexColor('#718096'))
        c.setLineWidth(2)
        c.line(x1, y1, x2, y2)
        # Arrow head using path
        arrow_size = 8
        c.setFillColor(colors.HexColor('#718096'))
        if y2 < y1:  # Arrow pointing down
            p = c.beginPath()
            p.moveTo(x2, y2)
            p.lineTo(x2 - arrow_size/2, y2 + arrow_size)
            p.lineTo(x2 + arrow_size/2, y2 + arrow_size)
            p.close()
            c.drawPath(p, fill=1, stroke=0)


class DataFlowDiagram(Flowable):
    def __init__(self, width, height):
        Flowable.__init__(self)
        self.width = width
        self.height = height
    
    def draw(self):
        c = self.canv
        
        # Colors
        colors_list = [
            colors.HexColor('#3182ce'),  # blue
            colors.HexColor('#38a169'),  # green
            colors.HexColor('#805ad5'),  # purple
            colors.HexColor('#dd6b20'),  # orange
            colors.HexColor('#d53f8c'),  # pink
        ]
        
        steps = [
            ("1", "User", "Sends message"),
            ("2", "Socket.IO", "WebSocket"),
            ("3", "Next.js API", "/api/chat"),
            ("4", "AI Service", "FastAPI"),
            ("5", "LangGraph", "Agent"),
            ("6", "LLM Router", "Select model"),
            ("7", "LLM API", "Generate"),
            ("8", "Stream", "Response"),
            ("9", "UI Update", "Real-time"),
        ]
        
        box_width = 80
        box_height = 50
        gap = 10
        per_row = 5
        
        for i, (num, title, desc) in enumerate(steps):
            row = i // per_row
            col = i % per_row
            
            x = 30 + col * (box_width + gap)
            y = self.height - 70 - row * (box_height + 40)
            
            color = colors_list[i % len(colors_list)]
            
            # Draw box
            c.setFillColor(color)
            c.roundRect(x, y, box_width, box_height, 8, fill=1, stroke=0)
            
            # Draw number circle
            c.setFillColor(colors.white)
            c.circle(x + 15, y + box_height - 12, 10, fill=1, stroke=0)
            c.setFillColor(color)
            c.setFont('Helvetica-Bold', 10)
            c.drawCentredString(x + 15, y + box_height - 16, num)
            
            # Draw text
            c.setFillColor(colors.white)
            c.setFont('Helvetica-Bold', 9)
            c.drawCentredString(x + box_width/2, y + 25, title)
            c.setFont('Helvetica', 8)
            c.drawCentredString(x + box_width/2, y + 12, desc)
            
            # Draw arrow to next
            if i < len(steps) - 1:
                if col < per_row - 1:
                    # Arrow right
                    c.setStrokeColor(colors.HexColor('#a0aec0'))
                    c.setLineWidth(2)
                    c.line(x + box_width + 2, y + box_height/2, x + box_width + gap - 2, y + box_height/2)
                else:
                    # Arrow down to next row
                    c.setStrokeColor(colors.HexColor('#a0aec0'))
                    c.setLineWidth(2)
                    next_y = y - 40
                    c.line(x + box_width/2, y - 2, x + box_width/2, next_y + box_height + 2)


def create_architecture_pdf():
    # Create PDF
    doc = SimpleDocTemplate(
        "Lawsphere_Architecture.pdf",
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1*cm,
        bottomMargin=1*cm
    )
    
    page_width = A4[0] - 2*cm
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a365d')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=18,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor('#2d3748')
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubheading',
        parent=styles['Heading3'],
        fontSize=14,
        spaceBefore=15,
        spaceAfter=8,
        textColor=colors.HexColor('#4a5568')
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=8,
        leading=14
    )
    
    # Content
    story = []
    
    # Title Page
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph("LAWSPHERE", title_style))
    story.append(Paragraph("Legal-Tech AI Platform", ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#718096')
    )))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("Architecture Documentation", ParagraphStyle(
        'DocType',
        parent=styles['Normal'],
        fontSize=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#a0aec0')
    )))
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", ParagraphStyle(
        'Date',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#a0aec0')
    )))
    story.append(PageBreak())
    
    # 1. System Architecture Diagram
    story.append(Paragraph("System Architecture", heading_style))
    story.append(Spacer(1, 0.2*inch))
    story.append(ArchitectureDiagram(page_width, 550))
    story.append(PageBreak())
    
    # 2. Data Flow
    story.append(Paragraph("Data Flow - Chat Message", heading_style))
    story.append(Spacer(1, 0.2*inch))
    story.append(DataFlowDiagram(page_width, 200))
    story.append(Spacer(1, 0.5*inch))
    
    # Key Features Table
    story.append(Paragraph("Key Features", subheading_style))
    features_data = [
        ["Feature", "Description"],
        ["Multi-LLM Support", "GPT-4, Claude 3, Gemini Pro with intelligent routing"],
        ["Real-time Chat", "Socket.IO powered live collaboration"],
        ["Document Processing", "PDF, DOCX, OCR with AI-powered analysis"],
        ["Legal Research", "Vector search with pgvector for semantic retrieval"],
        ["Authentication", "OAuth (Google, GitHub) + Credentials"],
        ["File Storage", "S3-compatible storage with MinIO"],
    ]
    features_table = Table(features_data, colWidths=[2.5*inch, 4*inch])
    features_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#2d3748')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    story.append(features_table)
    story.append(PageBreak())
    
    # 3. Frontend Stack
    story.append(Paragraph("Frontend Stack", heading_style))
    story.append(Paragraph("Located in: apps/web/", body_style))
    story.append(Spacer(1, 0.2*inch))
    
    frontend_data = [
        ["Component", "Technology", "Purpose"],
        ["Framework", "Next.js 14", "React framework with App Router"],
        ["UI Library", "React 18", "Component-based UI"],
        ["Styling", "Tailwind CSS", "Utility-first CSS framework"],
        ["Components", "Radix UI", "Accessible UI primitives"],
        ["State", "Zustand", "Lightweight state management"],
        ["Real-time", "Socket.IO", "WebSocket communication"],
        ["Auth", "NextAuth.js", "OAuth + Credentials"],
        ["ORM", "Prisma", "Type-safe database access"],
    ]
    frontend_table = Table(frontend_data, colWidths=[1.8*inch, 1.8*inch, 2.8*inch])
    frontend_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3182ce')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ebf8ff')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#90cdf4')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    story.append(frontend_table)
    story.append(Spacer(1, 0.3*inch))
    
    # 4. Backend Stack
    story.append(Paragraph("Backend Stack (AI Service)", heading_style))
    story.append(Paragraph("Located in: apps/ai-service/", body_style))
    story.append(Spacer(1, 0.2*inch))
    
    backend_data = [
        ["Component", "Technology", "Purpose"],
        ["Framework", "FastAPI", "High-performance Python API"],
        ["Server", "Uvicorn", "ASGI server"],
        ["AI Orchestration", "LangGraph", "Stateful agent workflows"],
        ["LLM Framework", "LangChain", "LLM abstractions"],
        ["Observability", "LangSmith", "Tracing and debugging"],
        ["OpenAI", "langchain-openai", "GPT-4, GPT-4o models"],
        ["Anthropic", "langchain-anthropic", "Claude 3 models"],
        ["Google", "langchain-google-genai", "Gemini models"],
    ]
    backend_table = Table(backend_data, colWidths=[1.8*inch, 2*inch, 2.6*inch])
    backend_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#38a169')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0fff4')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#9ae6b4')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    story.append(backend_table)
    story.append(PageBreak())
    
    # 5. Infrastructure
    story.append(Paragraph("Infrastructure Services", heading_style))
    infra_data = [
        ["Service", "Image", "Port", "Purpose"],
        ["PostgreSQL", "pgvector/pgvector:pg16", "5432", "Database + Vector Store"],
        ["Redis", "redis:7-alpine", "6379", "Cache, Sessions"],
        ["MinIO", "minio/minio:latest", "9000, 9001", "S3 File Storage"],
    ]
    infra_table = Table(infra_data, colWidths=[1.3*inch, 2.2*inch, 1*inch, 1.9*inch])
    infra_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#805ad5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#faf5ff')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d6bcfa')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    story.append(infra_table)
    story.append(Spacer(1, 0.4*inch))
    
    # 6. Service Ports
    story.append(Paragraph("Service URLs & Ports", heading_style))
    ports_data = [
        ["Service", "Port", "URL"],
        ["Web App", "3000", "http://localhost:3000"],
        ["AI Service", "8000", "http://localhost:8000"],
        ["API Docs", "8000", "http://localhost:8000/docs"],
        ["PostgreSQL", "5432", "postgresql://localhost:5432"],
        ["Redis", "6379", "redis://localhost:6379"],
        ["MinIO API", "9000", "http://localhost:9000"],
        ["MinIO Console", "9001", "http://localhost:9001"],
    ]
    ports_table = Table(ports_data, colWidths=[1.8*inch, 1*inch, 3.5*inch])
    ports_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    story.append(ports_table)
    story.append(Spacer(1, 0.4*inch))
    
    # 7. Quick Start Commands
    story.append(Paragraph("Quick Start Commands", heading_style))
    commands = [
        ["Command", "Description"],
        ["bash scripts/start-all.sh", "Start all services (Bash)"],
        ["scripts\\start-all.cmd", "Start all services (Windows)"],
        ["npm run dev:web", "Start web app only"],
        ["npm run dev:ai", "Start AI service only"],
        ["npm run db:studio", "Open Prisma Studio"],
        ["podman ps", "Check running containers"],
    ]
    cmd_table = Table(commands, colWidths=[3*inch, 3.5*inch])
    cmd_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dd6b20')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Courier'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#fbd38d')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fffaf0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(cmd_table)
    
    # Build PDF
    doc.build(story)
    print("✅ PDF generated: Lawsphere_Architecture.pdf")

if __name__ == "__main__":
    create_architecture_pdf()
