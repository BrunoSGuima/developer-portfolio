import type { ReactNode } from 'react';
import page from '../../sections/Page.module.css';

interface PageIntroProps {
  title: string;
  /** Intro paragraph under the heading. */
  lead: ReactNode;
  /** Optional content after the lead that stays in the intro's column, beside the Fun Fact. */
  column?: ReactNode;
  /** The rest of the page (full width below the intro and the Fun Fact), if any. */
  children?: ReactNode;
}

/**
 * A page split into an intro (heading + lead) and a body. In the shell's 'intro' placement
 * (≥ 64rem) the Fun Fact sits beside the intro and the body spans the full width below both;
 * otherwise the two slots are plain blocks. See AppLayout.module.css.
 */
function PageIntro({ title, lead, column, children }: PageIntroProps) {
  return (
    <>
      <div data-slot="page-intro">
        <h1>{title}</h1>
        <p className={page.lead}>{lead}</p>
        {column}
      </div>
      {children !== undefined && <div data-slot="page-body">{children}</div>}
    </>
  );
}

export default PageIntro;
