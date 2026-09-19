// Server-side markdown renderer for database-backed posts.
// Local MDX posts render through mdx-components.tsx instead — the
// wrapper classes below mirror those styles so both sources look alike.
import MarkdownIt from 'markdown-it';

import { resolveStaticAssetUrl } from '@/lib/static-asset-url';
import { cn } from '@/lib/utils';

export type MarkdownVariant = 'default' | 'game-site';

function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
});

// Headings get stable IDs so in-content anchors work.
md.renderer.rules.heading_open = function (tokens, idx) {
  const token = tokens[idx];
  const level = Number(token.tag.slice(1)) || token.markup.length;
  const nextToken = tokens[idx + 1];

  if (nextToken && nextToken.type === 'inline') {
    return `<h${level} id="${generateHeadingId(nextToken.content)}">`;
  }
  return `<h${level}>`;
};

// Relative Markdown images are portable DB asset paths. Resolve them through
// the deployment-level static asset origin instead of the current site host.
const defaultImageRenderer = md.renderer.rules.image;
md.renderer.rules.image = function (tokens, idx, options, env, renderer) {
  const token = tokens[idx];
  const src = token.attrGet('src');
  if (src) {
    const resolved = resolveStaticAssetUrl(src);
    if (resolved) token.attrSet('src', resolved);
  }

  return defaultImageRenderer
    ? defaultImageRenderer(tokens, idx, options, env, renderer)
    : renderer.renderToken(tokens, idx, options);
};

// External links open in a new tab with nofollow.
md.renderer.rules.link_open = function (tokens, idx, options, _env, renderer) {
  const token = tokens[idx];
  const href = token.attrGet('href');
  if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
    token.attrSet('rel', 'nofollow noopener');
    token.attrSet('target', '_blank');
  }
  return renderer.renderToken(tokens, idx, options);
};

// Shared typography for rendered markdown — also used by the admin rich-text
// editor so what you edit matches what the public pages render.
export const markdownStyles = cn(
  'text-[15px] leading-7 text-foreground/90',
  '[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground md:[&_h1]:text-2xl',
  '[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground md:[&_h2]:text-xl',
  '[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-foreground',
  '[&_p]:mt-2 [&_p]:leading-7',
  '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline',
  '[&_ul]:mt-2 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:marker:text-muted-foreground',
  '[&_ol]:mt-2 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:marker:text-muted-foreground',
  '[&_li]:leading-7',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-[0.4rem] [&_code]:py-[0.2rem] [&_code]:font-mono [&_code]:text-sm [&_code]:text-foreground',
  '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_hr]:my-8 [&_hr]:border-border',
  '[&_img]:my-4 [&_img]:rounded-xl',
  '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2'
);

export const gameSiteMarkdownStyles = cn(
  'text-[16px] leading-7 text-[#002b50]',
  '[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-[26px] [&_h1]:leading-8 [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-[#002b50]',
  '[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-[26px] [&_h2]:leading-8 [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-[#002b50]',
  '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[20px] [&_h3]:leading-7 [&_h3]:font-bold [&_h3]:text-[#002b50]',
  '[&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-[17px] [&_h4]:leading-6 [&_h4]:font-bold [&_h4]:text-[#002b50]',
  '[&_p]:my-3 [&_p]:leading-7 [&_p]:text-[#002b50]',
  '[&_a]:font-semibold [&_a]:text-[#0078c8] [&_a]:underline-offset-4 hover:[&_a]:underline',
  '[&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:marker:text-[#5d6b84]',
  '[&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:marker:text-[#5d6b84]',
  '[&_li]:leading-7 [&_li]:text-[#002b50]',
  '[&_li>ul]:my-1 [&_li>ol]:my-1',
  '[&_strong]:font-bold [&_strong]:text-[#002b50]',
  '[&_em]:text-[#31506c]',
  '[&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-[#b9d9eb] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#31506c]',
  '[&_code]:rounded [&_code]:bg-[#eef5f8] [&_code]:px-[0.4rem] [&_code]:py-[0.2rem] [&_code]:font-mono [&_code]:text-sm [&_code]:text-[#002b50]',
  '[&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#eef5f8] [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_hr]:my-8 [&_hr]:border-[#d8e5ec]',
  '[&_img]:my-5 [&_img]:max-w-full [&_img]:rounded-xl',
  '[&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-[#d8e5ec] [&_th]:bg-[#f6fafc] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold [&_td]:border [&_td]:border-[#d8e5ec] [&_td]:px-3 [&_td]:py-2'
);

function renderMarkdown(content: string, variant: MarkdownVariant) {
  if (!content) return '';

  if (variant === 'default') {
    return md.render(content);
  }

  const tokens = md.parse(content, {});

  // Public game-site pages already own the page-level H1. Legacy SEO markdown
  // sometimes starts with "# ..."; downgrade only those markdown H1 tokens to
  // H2 so the final document keeps a single semantic H1.
  for (const token of tokens) {
    if (
      (token.type === 'heading_open' || token.type === 'heading_close') &&
      token.tag === 'h1'
    ) {
      token.tag = 'h2';
      token.markup = '##';
    }
  }

  return md.renderer.render(tokens, md.options, {});
}

export function MarkdownContent({
  content,
  className,
  variant = 'default',
}: {
  content: string;
  className?: string;
  variant?: MarkdownVariant;
}) {
  const html = renderMarkdown(content, variant);

  return (
    <div
      className={cn(
        variant === 'game-site' ? gameSiteMarkdownStyles : markdownStyles,
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
