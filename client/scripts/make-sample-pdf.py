"""Builds a small 12-page text PDF (stdlib only) used by the client mock API."""
import sys, textwrap

pages = [
 ("Annual report 2025", ["Northwind Analytics, Inc.", "", "Fiscal year ended December 31, 2025.", "", "This report summarises the company's performance, strategy and", "outlook. Figures are unaudited and presented in US dollars."]),
 ("Contents", ["1. Letter to shareholders ........ 3", "2. Highlights of the year ........ 4", "3. Revenue and growth ............. 5", "4. Operating expenses ............. 6", "5. Product and research ........... 7", "6. Customers and markets .......... 8", "7. People and culture ............. 9", "8. Risks ......................... 10", "9. Sustainability ................ 11", "10. Outlook for 2026 ............. 12"]),
 ("1. Letter to shareholders", ["2025 was the year our retrieval platform became the core of the", "business. We grew revenue while keeping costs disciplined, and we", "shipped the evaluation tooling customers had been asking for.", "", "We enter 2026 with a healthy balance sheet and a clear plan."]),
 ("2. Highlights of the year", ["- Revenue grew 18% year over year to $42.6 million.", "- Gross margin improved from 71% to 74%.", "- Net revenue retention reached 121%.", "- Headcount grew from 160 to 182 people.", "- The company remained free-cash-flow positive for the full year."]),
 ("3. Revenue and growth", ["Total revenue was $42.6 million, up 18% from $36.1 million in 2024.", "Subscription revenue represented 86% of the total.", "", "Growth was driven by expansion within existing enterprise accounts", "and by the launch of the self-serve plan in the second quarter."]),
 ("4. Operating expenses", ["Operating expenses rose 9% to $27.4 million.", "Research and development was the largest line at $11.9 million.", "", "Infrastructure costs per customer fell 14% after moving inference", "to smaller models with prompt caching."]),
 ("5. Product and research", ["The research team focused on retrieval quality and evaluation.", "Key findings: maximal marginal relevance (MMR) retrieval improved", "answer faithfulness on long documents, and windowed conversation", "memory matched full-buffer memory at a fraction of the cost.", "", "Offline retrieval metrics (hit@k, MRR, nDCG) now gate every release."]),
 ("6. Customers and markets", ["The company served 1,240 paying customers at year end, up from 990.", "North America accounted for 58% of revenue, Europe for 29% and the", "rest of the world for 13%.", "", "The largest verticals were legal, financial services and research."]),
 ("7. People and culture", ["We ended the year with 182 employees across 14 countries.", "Employee engagement scored 82 out of 100 in the annual survey.", "", "We introduced a learning budget of $2,000 per person per year."]),
 ("8. Risks", ["Principal risks include dependence on third-party model providers,", "pricing pressure from larger platforms, data-protection regulation", "and the concentration of revenue in the top 20 customers (31%).", "", "Mitigations are described in the governance section."]),
 ("9. Sustainability", ["Scope 2 emissions fell 22% as workloads moved to regions with", "cleaner energy. All offices run on renewable electricity contracts.", "", "We publish a full sustainability report each April."]),
 ("10. Outlook for 2026", ["For 2026 we expect revenue growth of 15% to 20% and stable gross", "margins. Priorities: multi-document reasoning, enterprise controls", "and expanding the partner ecosystem.", "", "Thank you for your continued support."]),
]

def esc(t): return t.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

objs = []
def add(b): objs.append(b); return len(objs)

font = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
bold = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
pages_id = len(objs) + 1 + 2 * len(pages)
kids = []
for i, (title, lines) in enumerate(pages, 1):
    ops = [f"BT /F2 22 Tf 72 720 Td ({esc(title)}) Tj ET"]
    y = 680
    for line in lines:
        ops.append(f"BT /F1 12 Tf 72 {y} Td ({esc(line)}) Tj ET"); y -= 20
    ops.append(f"BT /F1 9 Tf 290 40 Td (Page {i} of {len(pages)}) Tj ET")
    stream = "\n".join(ops).encode()
    c = add(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
    p = add(f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 612 792] /Contents {c} 0 R /Resources << /Font << /F1 {font} 0 R /F2 {bold} 0 R >> >> >>".encode())
    kids.append(p)
assert add(f"<< /Type /Pages /Kids [{' '.join(f'{k} 0 R' for k in kids)}] /Count {len(kids)} >>".encode()) == pages_id
cat = add(f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode())

out = bytearray(b"%PDF-1.4\n")
offsets = []
for i, o in enumerate(objs, 1):
    offsets.append(len(out)); out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
xref = len(out)
out += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode()
for off in offsets: out += f"{off:010d} 00000 n \n".encode()
out += f"trailer\n<< /Size {len(objs)+1} /Root {cat} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
open(sys.argv[1], "wb").write(out)
