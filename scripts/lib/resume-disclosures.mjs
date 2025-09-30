import { parseHTML } from 'linkedom';
import { escapeHtml } from './agent-documents.mjs';

const text = node => node?.textContent.replace(/\s+/g, ' ').trim() || '';

// HTML remains the CV source. Derive labels from its semantic lists rather than
// maintaining another data catalog or counting duplicate decorative preview chips.
export function synchronizeResumeDisclosures(html) {
  const { document } = parseHTML(html);
  const panels = [...document.querySelectorAll('#resume details.resume-disclosure')];
  let index = 0;
  return html.replace(/<details\b[^>]*class="[^"]*\bresume-disclosure\b[^"]*"[^>]*>[\s\S]*?<\/details>/g, block => {
    const panel = panels[index++];
    if (!panel) throw new Error('Resume disclosure source does not match its semantic tree.');
    const summary = panel.querySelector('summary');
    const preview = panel.querySelectorAll('.resume-disclosure-preview .resume-tag');
    const isSummary = panel.classList.contains('resume-summary-more');
    const isContributions = panel.classList.contains('resume-contributions');
    const isCertificates = panel.closest('#resume-certifications');
    const total = panel.querySelectorAll(isCertificates ? '.timeline-item' : 'li').length;
    // Contribution/certificate details contain only the extra records; tool and
    // coursework details contain the full list represented by the closed preview.
    const extra = isContributions || isCertificates ? total : total - preview.length;
    const role = panel.closest('.timeline-item');
    const context = isSummary ? 'Summary' : isCertificates ? 'Certifications' :
      [isContributions ? 'Contributions' : '', text(role?.querySelector('.item-company')), text(role?.querySelector('.item-title'))].filter(Boolean).join(', ');
    if (!isSummary && extra <= 0) {
      // There is nothing additional to reveal. Keep all facts and the tool/course
      // heading as ordinary content, with no dead Show More (+0) control.
      const title = summary.querySelector('.resume-disclosure-title');
      const heading = title ? `<h5 class="resume-item-tech-label resume-disclosure-title">${escapeHtml(text(title))}</h5>` : '';
      return heading + block.replace(/^<details[^>]*>\s*/, '').replace(/<summary>[\s\S]*?<\/summary>/, '').replace(/<\/details>$/, '');
    }
    const count = isSummary ? '' : ` <span class="resume-disclosure-count">(+${extra})</span>`;
    summary.querySelector('.resume-when-closed').innerHTML = `Show More${count}`;
    summary.querySelector('.resume-when-open').textContent = 'Show Less';
    summary.querySelectorAll('.resume-preview-more, .resume-disclosure-context').forEach(node => node.remove());
    summary.innerHTML = summary.innerHTML.trimEnd() +
      `\n                            <span class="sr-only resume-disclosure-context"> — ${escapeHtml(context)}</span>\n                          `;
    return block.replace(/<summary>[\s\S]*?<\/summary>/, summary.outerHTML.replace(/^[\t ]+$/gm, ''));
  });
}
