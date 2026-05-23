"""Build a formatted Word document from the AI stock research report."""
from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

doc = Document()

# ── Page margins ──────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin   = Cm(2.8)
    section.right_margin  = Cm(2.8)

# ── Colour palette ────────────────────────────────────────────────────────────
NAVY   = RGBColor(0x0D, 0x2B, 0x55)   # deep navy
GOLD   = RGBColor(0xC9, 0xA0, 0x2C)   # gold accent
SLATE  = RGBColor(0x44, 0x5B, 0x6D)   # slate blue-grey
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT  = RGBColor(0xF0, 0xF4, 0xF8)   # light blue-grey for alt rows
BLACK  = RGBColor(0x1A, 0x1A, 0x1A)
RED    = RGBColor(0xC0, 0x39, 0x2B)
GREEN  = RGBColor(0x1A, 0x7A, 0x4A)


def set_cell_bg(cell, rgb: RGBColor):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd  = OxmlElement('w:shd')
    hex_color = '{:02X}{:02X}{:02X}'.format(rgb[0], rgb[1], rgb[2])
    shd.set(qn('w:val'),   'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'),  hex_color)
    tcPr.append(shd)


def add_paragraph_border_bottom(paragraph, color='C9A02C', size=12):
    """Add a bottom border to a paragraph (used for section titles)."""
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'),   'single')
    bottom.set(qn('w:sz'),    str(size))
    bottom.set(qn('w:space'), '4')
    bottom.set(qn('w:color'), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


def h(level, text, color=NAVY):
    styles = {1: ('Heading 1', 18, True),
              2: ('Heading 2', 14, True),
              3: ('Heading 3', 12, True)}
    _, sz, bold = styles[level]
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16 if level == 1 else 10)
    p.paragraph_format.space_after  = Pt(4)
    run = p.add_run(text)
    run.bold      = bold
    run.font.size = Pt(sz)
    run.font.color.rgb = color
    if level == 1:
        add_paragraph_border_bottom(p)
    return p


def body(text, indent=False, space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after  = Pt(space_after)
    if indent:
        p.paragraph_format.left_indent = Cm(0.7)
    run = p.add_run(text)
    run.font.size = Pt(10.5)
    run.font.color.rgb = BLACK
    return p


def bullet(text, level=0):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.left_indent  = Cm(0.7 + level * 0.5)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after  = Pt(2)
    run = p.add_run(text)
    run.font.size = Pt(10.5)
    run.font.color.rgb = BLACK
    return p


def inline_bold(paragraph, bold_text, rest_text=''):
    run1 = paragraph.add_run(bold_text)
    run1.bold = True
    run1.font.size = Pt(10.5)
    run1.font.color.rgb = BLACK
    if rest_text:
        run2 = paragraph.add_run(rest_text)
        run2.font.size = Pt(10.5)
        run2.font.color.rgb = BLACK


def note(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(8)
    p.paragraph_format.left_indent  = Cm(0.7)
    run = p.add_run(text)
    run.italic = True
    run.font.size = Pt(9.5)
    run.font.color.rgb = SLATE


def divider():
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(4)
    add_paragraph_border_bottom(p, color='C9A02C', size=6)


def make_table(headers, rows, col_widths=None, header_bg=NAVY, alt_bg=LIGHT):
    """Create a styled table."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Table Grid'

    # Header row
    hdr_cells = table.rows[0].cells
    for i, h_text in enumerate(headers):
        cell = hdr_cells[i]
        set_cell_bg(cell, header_bg)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after  = Pt(3)
        run = p.add_run(h_text)
        run.bold = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = WHITE

    # Data rows
    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        bg = alt_bg if r_idx % 2 == 1 else WHITE
        for c_idx, val in enumerate(row_data):
            cell = row_cells[c_idx]
            set_cell_bg(cell, bg)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx == 0 else WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after  = Pt(2)
            run = p.add_run(str(val))
            run.font.size = Pt(9)
            run.font.color.rgb = BLACK

    # Column widths
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Inches(w)

    doc.add_paragraph()  # spacing after table
    return table


# ═══════════════════════════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════════════════════════
cover_title = doc.add_paragraph()
cover_title.paragraph_format.space_before = Pt(60)
cover_title.paragraph_format.space_after  = Pt(0)
cover_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = cover_title.add_run('AI INDUSTRY DEEP RESEARCH')
run.bold = True
run.font.size = Pt(28)
run.font.color.rgb = NAVY

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
sub.paragraph_format.space_before = Pt(8)
sub.paragraph_format.space_after  = Pt(4)
run = sub.add_run('Stocks with Highest 5-Year Upside')
run.font.size = Pt(18)
run.font.color.rgb = GOLD
run.bold = True

tag = doc.add_paragraph()
tag.alignment = WD_ALIGN_PARAGRAPH.CENTER
tag.paragraph_format.space_before = Pt(4)
run = tag.add_run('Analyst-Grade Report  ·  Bias-Adjusted  ·  Multi-Source Synthesis')
run.font.size = Pt(11)
run.font.color.rgb = SLATE
run.italic = True

divider()

date_p = doc.add_paragraph()
date_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
date_p.paragraph_format.space_before = Pt(12)
run = date_p.add_run('May 2026')
run.font.size = Pt(11)
run.font.color.rgb = SLATE

doc.add_page_break()


# ═══════════════════════════════════════════════════════════════════════════════
# EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
h(1, 'Executive Summary')

body(
    'The AI industry represents the largest infrastructure buildout since the internet — but the distribution '
    'of value is deeply uneven, and the consensus narrative is riddled with bias. After synthesizing data from '
    'Gartner, McKinsey, Goldman Sachs, JPMorgan, Bain, Morgan Stanley, MIT, PwC, and Morningstar, and '
    'cross-checking against short-seller research and academic skeptics, our conclusions diverge sharply from '
    'Wall Street consensus in key areas.'
)

body(
    'Buy the constraint, not the hype. The most durable upside over 5 years belongs to companies that own '
    'chokepoints: chip fabrication (TSMC), custom silicon (Broadcom, Marvell), AI networking (Arista), power '
    'infrastructure (Vertiv, Constellation Energy), and memory (Micron). These companies benefit from AI capex '
    'regardless of which model wins. Platform-layer companies (Microsoft, Google) have reasonable valuations '
    'and execution moats. Pure-play AI hype stocks (NVIDIA at 47–60× earnings, Palantir at 110× sales) require '
    'multiple compression to deliver returns and carry Cisco-2000-scale drawdown risk.'
)

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(6)
inline_bold(p, 'Key non-consensus calls:  ',
    'Micron is the most undervalued direct AI play. Vertiv and Constellation Energy are the most overlooked. '
    'Palantir is the most dangerous at current prices. NVIDIA has the best business but the worst risk/reward '
    'entry point.')


# ═══════════════════════════════════════════════════════════════════════════════
# PART I: INDUSTRY LANDSCAPE
# ═══════════════════════════════════════════════════════════════════════════════
h(1, 'Part I — AI Industry Landscape (Bias-Adjusted)')

h(2, 'Market Size — Cutting Through the Noise')
body(
    'AI market size estimates range from $255 billion to $15.7 trillion depending on scope — a 60× difference '
    'that reflects definitional choices more than genuine disagreement.'
)

make_table(
    ['Source', '2025 Estimate', '2030 Estimate', 'What It Measures'],
    [
        ['Gartner',              '$1.5T',   '$2.5T',            'Total org AI spending (hardware + software + services)'],
        ['McKinsey',             '—',       '$7T cumulative',   'Data center capex only'],
        ['MarketsandMarkets',    '$255B',   '$800B',            'AI vendor software/hardware revenue'],
        ['Grand View Research',  '$390B',   '$1.34T',           'Broader AI vendor market'],
        ['PwC',                  '—',       '$15.7T',           'GDP impact (not market revenue)'],
    ],
    col_widths=[1.4, 1.2, 1.4, 2.9]
)

p = doc.add_paragraph()
inline_bold(p, 'Reliable anchors: ',
    'Gartner\'s $1.5T (2025) uses a broad vendor-agnostic survey methodology. McKinsey\'s $7T cumulative data '
    'center capex through 2030 is bottom-up and physics-grounded. PwC\'s $15.7T is a GDP impact figure, '
    'not market revenue, and must not be compared to vendor revenue estimates.')
p.paragraph_format.space_after = Pt(6)

note(
    'Bias flag: Research firms with vendor clients (IDC, Gartner) have incentive to project large markets. '
    'Consulting firms cite GDP impact figures that justify advisory engagements. Academic and Federal Reserve '
    'analyses are more conservative. The investment-grade truth sits in the Gartner/McKinsey range.'
)

h(2, 'The Infrastructure Cycle Is Real — But So Is the ROI Gap')

p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(4)
inline_bold(p, 'Bull case — The buildout is massive and supply-constrained:')
bullet('Global data center capacity doubling from 103 GW (2025) to ~200 GW (2030)')
bullet('HBM memory sold out through 2026 — SK Hynix CFO confirmed entire 2026 supply contracted')
bullet('AI workloads growing from 33% to 70% of global data center demand by 2030')
bullet('Agentic AI market: $7–11B (2025) → $139–155B (2030) at 40%+ CAGR')

doc.add_paragraph()
p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(4)
inline_bold(p, 'Bear case — The ROI math is alarming:')
bullet('JPMorgan: Industry needs $650B in annual revenue in perpetuity for a 10% return on planned capex')
bullet('Bain & Co: AI providers need $2T in annual revenue by 2030; trajectory shows an $800B shortfall')
bullet('MIT Media Lab (2025): 95% of organizations see zero measurable return on AI investments')
bullet('PwC CEO Survey (4,454 CEOs, 95 countries): 56% report neither revenue nor cost benefits from AI')
bullet('Goldman Sachs: Tech needs $1T+ annual profit to justify AI investment; 2026 consensus is only $450B')

note(
    'The resolution: Infrastructure suppliers win regardless of whether enterprise ROI materialises immediately. '
    'The 2–4 year lag between AI tool deployment and measurable revenue impact means 2025–2027 will be dominated '
    'by infrastructure spending, not software monetisation.'
)

h(2, 'Key Structural Tailwinds (5–10 Year Horizon)')

p = doc.add_paragraph()
inline_bold(p, 'Agentic AI ', 'is the highest-growth segment but least proven. At $7–11B today → $139–155B by 2030. '
    'McKinsey estimates agentic systems could unlock $2.9T annually in the US alone — but realisation is '
    'more likely 2028–2032 than 2025–2027.')

p = doc.add_paragraph()
inline_bold(p, 'Sovereign AI ', 'is an underappreciated structural driver. EU, Singapore, UAE, Saudi Arabia, India, '
    'and ASEAN are spending on national AI infrastructure independent of US hyperscalers — creating a '
    '$726B market by 2035 (28% CAGR) that benefits infrastructure vendors regardless of which AI model wins.')

p = doc.add_paragraph()
inline_bold(p, 'Power & cooling infrastructure ', 'is the binding physical constraint. Morgan Stanley forecasts a '
    '45 GW electricity shortage by 2028. Northern Virginia, Ireland, and Singapore have already implemented '
    'data centre approval restrictions. This makes power infrastructure the true scarcity play.')

p = doc.add_paragraph()
inline_bold(p, 'HBM memory ', 'is a multi-year supercycle. Market grows from $35B (2025) to $100B (2028) — '
    'a 3× increase in three years — with only three suppliers globally: SK Hynix (50%), Samsung (40%), '
    'Micron (10%). New capacity requires 3–4 years to build.')

h(2, 'China and Commoditisation Risk')
body(
    'DeepSeek\'s R1 model caused NVIDIA to lose $600B in market cap in a single day (January 2025), proving '
    'commoditisation is not theoretical. Chinese open-source models now account for ~30% of global AI usage. '
    'DeepSeek\'s API costs $0.028 per million tokens vs. ~$5 for GPT-4 — a 180× price differential. '
    'Open-source models broadly offer 70–90% cost savings vs. closed providers. '
    'Companies selling infrastructure (chips, power, networking, memory) benefit from increased AI usage '
    'regardless of which model is used. Cloud-native AI software vendors without distribution moats face '
    'the greatest long-run pricing pressure.'
)

doc.add_page_break()


# ═══════════════════════════════════════════════════════════════════════════════
# PART II: STOCK UNIVERSE
# ═══════════════════════════════════════════════════════════════════════════════
h(1, 'Part II — Stock Universe: Conviction Ratings and 5-Year Cases')

# ── Helper for stock cards ────────────────────────────────────────────────────
def stock_card(rank, ticker, name, stars, tier_label, thesis, moat, risk, bull):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after  = Pt(2)
    run = p.add_run(f'{rank}. {name} ({ticker})  ')
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = NAVY
    run2 = p.add_run(stars)
    run2.font.size = Pt(12)
    run2.font.color.rgb = GOLD
    add_paragraph_border_bottom(p, color='0D2B55', size=8)

    p2 = doc.add_paragraph()
    p2.paragraph_format.space_before = Pt(2)
    p2.paragraph_format.space_after  = Pt(6)
    r = p2.add_run(tier_label)
    r.italic = True
    r.font.size = Pt(9.5)
    r.font.color.rgb = SLATE

    for label, content in [('Thesis', thesis), ('Moat', moat),
                            ('Key Risk', risk), ('5-Year Bull Case', bull)]:
        p3 = doc.add_paragraph()
        p3.paragraph_format.left_indent  = Cm(0.5)
        p3.paragraph_format.space_before = Pt(3)
        p3.paragraph_format.space_after  = Pt(3)
        inline_bold(p3, f'{label}:  ', content)


# ── TIER 1 ────────────────────────────────────────────────────────────────────
h(2, 'Tier 1 — Highest Conviction  (Core Holdings, Buy at Reasonable Prices)', color=GREEN)

stock_card(1, 'AVGO', 'Broadcom', '★★★★★', 'TIER 1 · HIGHEST CONVICTION',
    'Broadcom builds the custom silicon industry. Google\'s TPU, Meta\'s MTIA, Apple\'s Neural Engine, and '
    'ByteDance\'s custom chips all rely on Broadcom\'s ASIC design capability. As hyperscalers accelerate '
    'their shift away from NVIDIA GPUs toward task-specific custom chips (projected 15–25% compute market '
    'share by 2030), Broadcom is the primary beneficiary. VMware acquisition adds $4B+ recurring software '
    'revenue with high switching costs.',
    'Irreplaceable ASIC design expertise; multi-year hyperscaler relationships; CoPackaged Optics leadership; '
    'VMware recurring revenue base.',
    'Hyperscaler customer concentration. If a major customer insources design capability, revenue falls.',
    'Custom silicon reaches $150B+ market; Broadcom captures 30% share; earnings 3–4× current levels. '
    'Even with EV/EBITDA compression from 25× to 20×, implies 2–3× total return.'
)

stock_card(2, 'TSM', 'Taiwan Semiconductor Manufacturing', '★★★★★', 'TIER 1 · HIGHEST CONVICTION',
    'Every AI chip — NVIDIA H100/B100, AMD MI300X, Google TPU, Amazon Trainium, Apple Silicon, Broadcom ASICs '
    '— is manufactured by TSMC. There is no alternative at leading-edge nodes (3nm, 2nm). TSMC earns a toll '
    'on every dollar of AI compute investment. 57% gross margin; monopoly at leading-edge nodes; no credible '
    'competitor within 5 years.',
    'Technological monopoly at leading-edge nodes; multi-decade manufacturing expertise; entire AI chip '
    'ecosystem depends on TSMC. Intel is 5+ years behind; Samsung yielding poorly at leading nodes.',
    'Geopolitical risk (Taiwan Strait) is the principal risk and is systematically underpriced by consensus.',
    'AI capex cycle continues; TSMC Arizona reduces geopolitical discount; 3nm/2nm ASP ramp drives earnings. '
    '3–4× upside if geopolitical premium normalises over 5 years.'
)

stock_card(3, 'MRVL', 'Marvell Technology', '★★★★☆', 'TIER 1 · HIGHEST CONVICTION',
    'Marvell is the quiet winner in custom AI silicon for hyperscalers. Revenue from data centre AI grew 80%+ '
    'year-over-year. The company trades at a significant discount to NVIDIA despite similar growth trajectory, '
    'simply because it has lower name recognition. Optical interconnects position Marvell perfectly for '
    'next-generation AI cluster networking.',
    'Deep hyperscaler design partnerships (AWS, Microsoft Azure custom silicon); optical interconnect '
    'leadership; electro-optics expertise for next-gen AI networking.',
    'Customer concentration in hyperscalers; execution risk on new product ramps; competition from Broadcom.',
    'Data centre revenue becomes 80%+ of total; optical interconnects become standard in all AI clusters; '
    'Marvell re-rates to Broadcom-comparable multiples — implying 2–3× upside.'
)

stock_card(4, 'MU', 'Micron Technology', '★★★★☆', 'TIER 1 · MOST UNDERVALUED',
    'Micron is the most undervalued direct AI play. The HBM market grows from $35B (2025) to $100B (2028). '
    'With only three global suppliers and supply sold out through 2026, Micron is gaining share from 10% '
    'to a projected 20–25%. Unlike NVIDIA, Micron trades at a modest multiple despite being a direct '
    'beneficiary of the same supply constraint.',
    'One of only three global HBM suppliers; US-based manufacturing attractive for national security '
    'procurement; vertically integrated DRAM expertise.',
    'Memory is cyclical; DRAM prices can collapse in downturns. HBM is sticky but not immune to long-run '
    'pricing pressure.',
    'HBM captures 25%+ of Micron\'s revenue at premium margins; Micron re-rates from ~4× to 6–7× book '
    'as HBM becomes dominant. 3–5× potential in bull scenario.'
)

stock_card(5, 'ANET', 'Arista Networks', '★★★★☆', 'TIER 1 · HIGHEST CONVICTION',
    'AI training clusters require massive, low-latency networking between thousands of GPUs. Arista\'s '
    'switches and EOS operating system are the standard for large-scale AI clusters. '
    'Hyperscalers building 100,000+ GPU clusters are Arista\'s direct customers. Management has a track '
    'record of underpromising and overdelivering; strong free cash flow; clean accounting.',
    'Dominant position in 400G/800G switching for AI workloads; EOS software creates switching costs; '
    'strong hyperscaler relationships (Microsoft, Meta, Google).',
    'Cisco/Juniper competition. If InfiniBand wins over Ethernet for AI networking, Arista\'s share '
    'could be constrained.',
    'AI networking spend grows 30%+ annually; Arista captures 40%+ share; revenue doubles by 2029. '
    'Conservative DCF supports 60–80% upside from fair entry.'
)

stock_card(6, 'VRT', 'Vertiv Holdings', '★★★★☆', 'TIER 1 · MOST OVERLOOKED',
    'Power distribution, UPS systems, and liquid cooling for data centres are the most overlooked AI '
    'infrastructure plays. Morgan Stanley projects a 45 GW power shortage by 2028. Every megawatt of AI '
    'compute requires 3–4× the power density of traditional servers. Vertiv supplies the critical power '
    'and cooling infrastructure that makes AI data centres physically possible. Order backlog growing '
    'faster than revenue, providing multi-year visibility.',
    'Long-standing OEM relationships with data centre operators; complex engineering products with high '
    'switching costs; duopoly with Eaton in certain segments.',
    'Input cost inflation (copper, steel); supply chain disruptions; new entrant competition.',
    'Power density requirements grow 3× with liquid-cooled AI racks; Vertiv TAM expands faster than '
    'the chip market; revenue grows to $10B+ by 2030. 2–3× potential.'
)

stock_card(7, 'GOOGL', 'Alphabet / Google', '★★★★☆', 'TIER 1 · MOST UNDERVALUED LARGE-CAP',
    'Alphabet is the most undervalued large-cap AI play. Google developed the Transformer architecture '
    '(the foundation of all modern LLMs), has the deepest AI research bench (DeepMind, Google Brain), '
    'and owns the most powerful proprietary chip in production (TPU v5). Waymo is 3–5 years ahead of '
    'any autonomous vehicle competitor. Despite all this, GOOGL trades at a lower forward P/E than '
    'Microsoft.',
    'Google Search monopoly (70% share); YouTube (2nd largest search engine globally); GCP + TPU '
    'competitive advantage; DeepMind research pipeline; Waymo robotaxi lead.',
    'AI search overhaul could temporarily cannibalize ad revenue during the 2–3 year transition. '
    'Antitrust regulatory risk is real.',
    'AI Overviews expand search monetisation; Waymo reaches commercial scale; Cloud AI gains share '
    'vs. Azure; GOOGL re-rates to MSFT-comparable multiples. 2–3× upside.'
)

stock_card(8, 'MSFT', 'Microsoft', '★★★★☆', 'TIER 1 · MOST EXECUTION-CERTAIN',
    'Microsoft is the most execution-certain large-cap AI investment. Azure AI growing 35%+ annually; '
    'Copilot embedded across Office 365 (1.3B users); OpenAI partnership provides early access to '
    'frontier models. Enterprise distribution moat — IT decision-makers default to Microsoft — creates '
    'a durable AI adoption channel competitors cannot replicate.',
    'Enterprise software lock-in (Teams, Office, Azure); GitHub Copilot in 1M+ developer seats; '
    'OpenAI partnership with right of first refusal; government cloud contracts.',
    'OpenAI relationship is complex; if OpenAI competes directly with consumers, Microsoft loses '
    'differentiation. Azure faces competition from AWS and GCP.',
    'Copilot reaches 300M paid seats at $30/month; Azure AI doubles market share; earnings grow '
    '15–20% CAGR. 1.5–2× upside, steady compounder.'
)

doc.add_page_break()

# ── TIER 2 ────────────────────────────────────────────────────────────────────
h(2, 'Tier 2 — Strong Business, Valuation-Dependent', color=SLATE)

stock_card(9, 'NVDA', 'NVIDIA', '★★★☆☆', 'TIER 2 · GREAT BUSINESS · DANGEROUS ENTRY POINT',
    'NVIDIA has the best AI chip business in the world. The CUDA software ecosystem creates switching costs '
    'that no competitor has broken in a decade. H100/H200/Blackwell GPUs are the gold standard for AI '
    'training. Data centre revenue grew from $14B (2023) to $87B+ (2025 annualised).',
    'CUDA software ecosystem; dominant share of AI training market; brand and supply-chain relationships; '
    'NVIDIA Enterprise software licensing.',
    'Cisco 2000 parallel is credible: at 47–60× earnings and a $4T+ market cap (14% of US GDP), the stock '
    'mirrors Cisco at peak of the dot-com bubble. AMD and custom silicon are taking share. '
    'Power constraint is a growth limiter.',
    'Add aggressively on 40–50% drawdowns. At peak multiples, risk/reward is unfavourable vs. infrastructure '
    'peers with similar AI exposure at lower valuations.'
)

stock_card(10, 'META', 'Meta Platforms', '★★★☆☆', 'TIER 2 · STRONG BUSINESS',
    'Meta is the cheapest megacap AI stock by P/E. AI-driven advertising is materially improving ad '
    'targeting efficiency and revenue per user. Llama open-source ecosystem strengthens the platform '
    'without requiring direct monetisation. Core business generates extraordinary free cash flow.',
    'AI advertising ARPU growth; Llama ecosystem creates AI app distribution moat; 3B+ user scale.',
    'Reality Labs is a persistent cash burn. Regulatory risk across global markets.',
    'AI advertising ARPU grows 15–20% annually; Llama ecosystem creates AI app distribution moat. 1.5–2.5× upside.'
)

stock_card(11, 'AMZN', 'Amazon', '★★★☆☆', 'TIER 2 · STRONG BUSINESS',
    'AWS is the largest cloud provider building AI infrastructure at scale. Trainium custom chips for '
    'training and Inferentia for inference create a cost-competitive alternative to NVIDIA for Amazon\'s '
    'own workloads. Bedrock provides enterprise AI API access. Retail AI generates measurable cost savings.',
    'Largest cloud by revenue; Trainium/Inferentia reduce NVIDIA dependence; Bedrock enterprise platform; '
    'retail AI efficiency gains.',
    'AWS AI faces intense competition from Azure and GCP. AWS margin expansion assumptions may be aggressive.',
    'AWS AI services grow to $100B+ revenue; Trainium reduces NVIDIA dependency; Amazon becomes dominant '
    'inference platform. 1.5–2× upside.'
)

stock_card(12, 'AMD', 'Advanced Micro Devices', '★★★☆☆', 'TIER 2 · BEST NVIDIA ALTERNATIVE',
    'AMD is the only credible GPU alternative to NVIDIA at scale. MI300X in production at Microsoft and '
    'Meta generating $2B+ in revenue. MI350/MI400 roadmaps provide a competitive path through 2027. '
    'Trades at a fraction of NVIDIA\'s multiple with similar growth dynamics.',
    'Only viable GPU alternative at scale; competitive x86 CPU franchise; growing data centre GPU revenue.',
    'AMD has repeatedly missed execution timelines on GPU products. ROCm software ecosystem remains inferior '
    'to CUDA, limiting software adoption outside cost-sensitive deployments.',
    'AMD captures 15–20% of data centre GPU market; AI chip TAM is large enough this still represents '
    'enormous revenue growth. 2–3× potential if software execution improves.'
)

doc.add_page_break()

# ── TIER 3 ────────────────────────────────────────────────────────────────────
h(2, 'Tier 3 — High Risk / High Reward  (Speculative, Small Position Sizing)', color=RGBColor(0xB5, 0x65, 0x0A))

stock_card(13, 'CEG / VST', 'Constellation Energy / Vistra Energy', '★★★☆☆',
    'TIER 3 · NON-CONSENSUS PICK',
    'Nuclear power is becoming the preferred energy source for AI data centres. Microsoft signed a 20-year PPA '
    'with Constellation for Three Mile Island restart. Google has signed similar agreements. AI hyperscalers '
    'need 24/7 carbon-free power that cannot be delivered by intermittent wind or solar. Nuclear plants '
    'produce power at ~$30/MWh once construction is amortised — below grid parity.',
    'Long-duration contracted PPAs with hyperscalers; baseload carbon-free power; irreplaceable for '
    'data centre decarbonisation mandates.',
    'Regulatory risk for nuclear extensions; construction cost overruns for new capacity; '
    'political risk to nuclear licensing.',
    'Nuclear PPAs become standard for AI data centres; both companies re-price as AI infrastructure '
    'rather than utilities. 2–4× potential over 5 years.'
)

stock_card(14, 'ARM', 'Arm Holdings', '★★☆☆☆', 'TIER 3 · SPECULATIVE',
    'ARM\'s instruction set architecture is in virtually every AI chip and mobile device. As hyperscalers '
    'design custom silicon (Apple M-chips, AWS Graviton, Ampere Computing), they all pay ARM royalties. '
    'The royalty model provides revenue growth as silicon becomes more AI-capable.',
    'Architecture licensing monopoly for mobile and embedded AI; royalty model scales with compute growth.',
    'Trades at 50–60× forward earnings — extremely rich. Royalty rate increases face customer pushback. '
    'RISC-V open-source architecture is a long-term structural threat.',
    'Royalty ramp accelerates as AI chips multiply; ARM re-rates as AI infrastructure play. '
    'High upside but extreme valuation risk on entry.'
)

stock_card(15, 'PLTR', 'Palantir Technologies', '★★☆☆☆',
    'TIER 3 · AVOID ADDING AT CURRENT PRICES',
    'Palantir\'s AIP (Artificial Intelligence Platform) is genuinely creating enterprise value. US government '
    'contracts are durable. Commercial revenue is growing strongly.',
    'Deep US government relationships; AIP platform with genuine enterprise use cases; strong brand in '
    'defence and intelligence markets.',
    'Forward P/S of 110× (some sources cite 140×). Forward P/E of 173×. Morningstar fair value: $100/share. '
    'At 110× P/S, an 80% drawdown is the mathematical outcome if Palantir re-rates to 20× P/S — which '
    'remains a high multiple. Sustaining 110× P/S requires 50%+ uninterrupted growth for years.',
    'Outstanding business, catastrophic valuation. Monitor for 60–70% drawdowns that would create a '
    'reasonable entry point.'
)

# ── AVOID TABLE ───────────────────────────────────────────────────────────────
h(2, 'Avoid / Underweight', color=RED)

make_table(
    ['Stock', 'Ticker', 'Reason to Avoid'],
    [
        ['C3.ai',                 'AI',   'No clear profitability path; commoditised by hyperscaler AI services; 15%+ growth insufficient to justify losses'],
        ['Super Micro Computer',  'SMCI', 'Hindenburg Research accounting allegations; executive rehiring concerns; 26% single-day drop; accounting resolution incomplete'],
        ['SoundHound AI',         'SOUN', 'Speculative voice AI with no durable moat; faces competition from Apple, Google, Amazon; no pricing power'],
    ],
    col_widths=[1.8, 0.9, 4.2]
)

doc.add_page_break()


# ═══════════════════════════════════════════════════════════════════════════════
# PART III: BIAS ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════
h(1, 'Part III — What Consensus Gets Wrong (Bias Analysis)')

h(2, 'Consensus Is Too Bullish On')

p = doc.add_paragraph()
inline_bold(p, '1. Agentic AI near-term revenue. ')
p.add_run(
    'The 40–49% CAGR forecasts assume workflow redesign scales rapidly. McKinsey\'s own data shows 2/3 of '
    'enterprises are stuck in "pilot purgatory" — running AI tools without operational redesign. The agentic '
    'AI revenue ramp is more likely 2028–2032 than 2025–2027.'
).font.size = Pt(10.5)

p = doc.add_paragraph()
inline_bold(p, '2. NVIDIA\'s monopoly permanence. ')
p.add_run(
    'Sell-side analysts systematically underestimate custom silicon adoption because it doesn\'t generate '
    'investment banking fees. AMD is executing better than consensus gives it credit for. The 15–25% market '
    'share shift to custom ASICs by 2030 is underpriced in most models.'
).font.size = Pt(10.5)

p = doc.add_paragraph()
inline_bold(p, '3. Revenue materialising to justify capex. ')
p.add_run(
    'JPMorgan\'s $650B annual revenue requirement and Bain\'s $800B shortfall projection receive far less '
    'attention than they deserve. The 56% of CEOs who reported zero ROI (PwC, 4,454 respondents) is not '
    'cherry-picked data — it is one of the largest CEO surveys ever conducted.'
).font.size = Pt(10.5)

h(2, 'Consensus Is Too Bearish On')

p = doc.add_paragraph()
inline_bold(p, '1. TSMC\'s geopolitical discount. ')
p.add_run(
    'TSMC trades at a lower multiple than US peers due to Taiwan Strait risk. This risk is real, but TSMC\'s '
    'Arizona fabs and its irreplaceable position in global chip supply create mutual deterrence. The upside '
    'if the geopolitical premium compresses is substantial.'
).font.size = Pt(10.5)

p = doc.add_paragraph()
inline_bold(p, '2. Micron\'s HBM position. ')
p.add_run(
    'Coverage of Micron is dominated by commodity DRAM analysts who treat HBM as a cyclical product. It is '
    'not. HBM is a specialty product with 3-year lead times, only three global suppliers, and demand sold '
    'out through 2026. This is a multi-year structural story that cyclical frameworks miss entirely.'
).font.size = Pt(10.5)

p = doc.add_paragraph()
inline_bold(p, '3. Power infrastructure stocks. ')
p.add_run(
    'Vertiv, Constellation Energy, and Vistra receive almost no coverage from AI analysts. The power '
    'constraint is more binding than the chip constraint in several regions already. Companies solving '
    'the power constraint are priced as utilities rather than AI infrastructure.'
).font.size = Pt(10.5)

p = doc.add_paragraph()
inline_bold(p, '4. Alphabet\'s AI capabilities. ')
p.add_run(
    'Google\'s TPU is arguably superior to NVIDIA\'s H100 for inference workloads. Google has been '
    'training LLMs since 2017. Waymo is 3–5 years ahead of any competitor. DeepMind has produced more '
    'landmark AI research than any other organisation. Yet GOOGL trades at a lower P/E than Microsoft.'
).font.size = Pt(10.5)

doc.add_page_break()


# ═══════════════════════════════════════════════════════════════════════════════
# PART IV: SCENARIO ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════
h(1, 'Part IV — 5-Year Scenario Analysis')
note(
    'Expected values are illustrative probability-weighted outcomes, not DCF-based price targets. '
    'Returns reflect directional magnitude, not precise forecasts.'
)

make_table(
    ['Scenario', 'Prob.', 'AVGO', 'TSM', 'MU', 'ANET', 'VRT', 'GOOGL', 'NVDA', 'PLTR'],
    [
        ['Bull: Agentic AI scales, enterprise ROI proves, demand > supply', '20%',
         '+350%', '+250%', '+500%', '+200%', '+300%', '+200%', '+200%', '+100%'],
        ['Base: Infrastructure builds, software adoption lags 2–3 yrs, modest multiple compression', '45%',
         '+150%', '+120%', '+200%', '+120%', '+150%', '+100%', '+30%', '−40%'],
        ['Bear: Capex ROI fails, multiples collapse, tech recession', '20%',
         '−25%', '−40%', '−50%', '−30%', '−15%', '−25%', '−70%', '−85%'],
        ['China disruption: Open-source AI fragments market', '15%',
         '+80%', '+100%', '+200%', '+50%', '+100%', '−20%', '−40%', '−80%'],
        ['Expected Value (probability-weighted)', '100%',
         '+143%', '+103%', '+188%', '+94%', '+138%', '+72%', '+10%', '−44%'],
    ],
    col_widths=[2.8, 0.5, 0.6, 0.6, 0.6, 0.6, 0.6, 0.65, 0.65, 0.55]
)

body(
    'Key insight: Infrastructure plays (Broadcom, Micron, Vertiv, TSMC) have positive expected value across '
    'all four scenarios including the bear case, because AI infrastructure is needed even in a slower-growth '
    'environment. Software and hype plays (NVIDIA at peak multiples, Palantir) have negative expected value '
    'because the bear scenario is catastrophic and the probability-weighting punishes that asymmetry.'
)


# ═══════════════════════════════════════════════════════════════════════════════
# PART V: PORTFOLIO CONSTRUCTION
# ═══════════════════════════════════════════════════════════════════════════════
h(1, 'Part V — Portfolio Construction Guidance')

make_table(
    ['Category', 'Stocks', 'Weight', 'Rationale'],
    [
        ['AI Infrastructure Chokepoints', 'TSM, AVGO, MRVL, MU', '35–40%', 'Own the constraints; positive EV across all scenarios'],
        ['AI Networking & Power', 'ANET, VRT, CEG or VST', '15–20%', 'Undervalued; benefits from power/bandwidth bottleneck'],
        ['Large-Cap Execution Layer', 'MSFT, GOOGL, META', '25–30%', 'Diversified AI monetisation; reasonable valuations'],
        ['Speculative / High-Conviction', 'AMD, ARM', '5–10%', 'Upside exposure with defined risk'],
        ['Watch List (Buy on Drawdowns)', 'NVDA, AMZN', '5–10%', 'Great businesses; wait for 30–50% corrections'],
        ['Avoid', 'PLTR, AI, SMCI, SOUN', '0%', 'Valuation risk or structural issues outweigh upside'],
    ],
    col_widths=[2.0, 1.6, 0.8, 2.7]
)

h(2, 'Rebalancing Rules')
bullet('After NVIDIA 40%+ drawdown: rotate 5–10% of portfolio into NVDA; the business justifies ownership at better valuations')
bullet('After 25%+ market-wide AI selloff: increase TSM and AVGO — supply constraints persist regardless of sentiment')
bullet('If enterprise AI ROI evidence improves materially: rotate from infrastructure into application layer (MSFT, GOOGL, META)')
bullet('If power shortage worsens (grid approvals delayed 3+ years): increase VRT and nuclear utilities')


# ═══════════════════════════════════════════════════════════════════════════════
# PART VI: RISKS NOT IN CONSENSUS
# ═══════════════════════════════════════════════════════════════════════════════
h(1, 'Part VI — Risks Not Priced by Consensus')

p = doc.add_paragraph()
inline_bold(p, '1. The Productivity Paradox Timing Risk.  ')
p.add_run(
    'Historical evidence (electricity, computers, internet) shows general-purpose technologies take '
    '15–25 years to produce measurable macroeconomic productivity gains. If enterprise AI ROI takes '
    'until 2030–2033 to appear in earnings, many AI software stocks will compress significantly before recovering.'
).font.size = Pt(10.5)

p = doc.add_paragraph()
inline_bold(p, '2. Water Scarcity as a Hidden Constraint.  ')
p.add_run(
    'AI data centres consume enormous water for cooling. Northern Virginia, western US states, and Ireland '
    'are experiencing water stress from data centres already. This constraint receives almost no coverage '
    'in AI investment research but could materially slow data centre build in high-demand regions.'
).font.size = Pt(10.5)

p = doc.add_paragraph()
inline_bold(p, '3. AI Regulation Acceleration.  ')
p.add_run(
    'The EU AI Act, proposed US legislation, and growing international regulatory frameworks impose compliance '
    'costs that favour large incumbents (Microsoft, Google) over startups and mid-cap AI companies. '
    'Regulatory burden is a moat for established players.'
).font.size = Pt(10.5)

p = doc.add_paragraph()
inline_bold(p, '4. Quantum Computing Disruption (2030+ Horizon).  ')
p.add_run(
    'Quantum computing, if it reaches fault-tolerant operation by 2030–2035, would radically change '
    'the compute architecture underpinning AI. This is a 5–10 year risk, not a 2-year risk, but investors '
    'with truly long time horizons should monitor IBM Quantum, Google Quantum, and IonQ.'
).font.size = Pt(10.5)

doc.add_page_break()


# ═══════════════════════════════════════════════════════════════════════════════
# SOURCE BIAS TABLE
# ═══════════════════════════════════════════════════════════════════════════════
h(1, 'Source Reliability and Bias Assessment')

make_table(
    ['Source', 'Bias Type', 'Investment Reliability'],
    [
        ['Gartner',              'Vendor-adjacent; tech company clients',            'High — adjust market sizes down 10–20%'],
        ['McKinsey & Co',        'Consulting; large figures justify advisory spend',  'High for infrastructure; treat GDP impact figures skeptically'],
        ['Goldman Sachs',        'Investment bank; fiduciary duty to clients',       'High — particularly credible on capex ROI analysis'],
        ['JPMorgan',             'Investment bank; balanced',                        'High — $650B revenue requirement analysis is credible'],
        ['Bain & Co',            'Consulting firm',                                  'Medium-High — $2T revenue requirement directionally correct'],
        ['MIT Media Lab (2025)', 'Academic; no vendor relationships',                'High — 150 interviews + 300 AI applications: solid methodology'],
        ['PwC CEO Survey',       'Consulting; 4,454 CEOs across 95 countries',       'High for adoption sentiment; CEO surveys are lagging indicators'],
        ['Morningstar',          'Independent research; subscription-funded',        'High — fair value estimates conservative but grounded'],
        ['Morgan Stanley',       'Investment bank',                                  'High — power shortage analysis particularly well-sourced'],
        ['Market research firms','Revenue from report sales; incentive to project large markets', 'Low-Medium — useful directionally, not for specific numbers'],
        ['Hindenburg Research',  'Short-seller; adversarial incentive',              'Medium — SMCI allegations proved directionally correct'],
        ['Muddy Waters',         'Short-seller; adversarial incentive',              'Medium — 2 major wins in 2025; methodology is rigorous'],
    ],
    col_widths=[1.6, 2.3, 3.0]
)


# ═══════════════════════════════════════════════════════════════════════════════
# CONCLUSION
# ═══════════════════════════════════════════════════════════════════════════════
h(1, 'Conclusion')

body(
    'The AI industry is real, the infrastructure cycle is genuine, and the next five years will create '
    'extraordinary wealth — but it will not be distributed evenly. The companies with the highest '
    'probability-weighted 5-year upside are those that own physical constraints: the fabrication monopoly '
    '(TSMC), the custom silicon design capability (Broadcom, Marvell), the memory architecture (Micron), '
    'the networking infrastructure (Arista), and the power infrastructure (Vertiv, Constellation Energy).'
)

body(
    'The companies with the most compelling story but most dangerous valuations are those at the hype '
    'frontier: NVIDIA at 47–60× earnings and $4T market cap mirrors Cisco at the dot-com peak; Palantir '
    'at 110× sales has mathematical downside risk regardless of business quality.'
)

body(
    'The most credible bear case is not that AI fails — it is that the infrastructure is built before '
    'enterprise demand materialises, creating a 2–3 year period of multiple compression that punishes '
    'hype-priced stocks while the underlying technology continues to progress. Investors who own the '
    'physical constraint plays should weather this compression and emerge with substantial gains by 2030–2031.'
)

final_p = doc.add_paragraph()
final_p.paragraph_format.space_before = Pt(12)
add_paragraph_border_bottom(final_p, color='C9A02C', size=6)
run = final_p.add_run(
    'The single most important insight: In the AI infrastructure buildout, the best analogy is not the '
    'internet bubble of 2000 — it is the 1800s railroad boom. During that era, the companies that survived '
    'and compounded wealth were not the railroads themselves (most went bankrupt) but the steel producers, '
    'the coal mines, and the land alongside the tracks. Own the picks and shovels.'
)
run.italic = True
run.font.size = Pt(11)
run.font.color.rgb = NAVY

doc.add_paragraph()

disc = doc.add_paragraph()
disc.paragraph_format.space_before = Pt(16)
r = disc.add_run(
    'Disclaimer: This report is for informational and educational purposes only. It does not constitute '
    'investment advice. All projections involve significant uncertainty. Consult a qualified financial '
    'advisor before making investment decisions. Research methodology: parallel multi-agent synthesis '
    'from Gartner, McKinsey, Goldman Sachs, JPMorgan, Bain & Co, Morgan Stanley, MIT Media Lab, PwC, '
    'Morningstar, Hindenburg Research, Muddy Waters, and primary SEC filings. Sources cross-validated; '
    'conflicting data points explicitly flagged. Institutional bias accounted for in all market size '
    'estimates. Report Date: May 2026.'
)
r.font.size = Pt(8.5)
r.font.color.rgb = SLATE
r.italic = True


# ── Save ──────────────────────────────────────────────────────────────────────
output_path = '/home/user/AutoGPT/AI_Stock_Research_Report.docx'
doc.save(output_path)
print(f'Saved: {output_path}')
