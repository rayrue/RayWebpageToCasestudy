const parsingService = require('../../src/services/parsingService');

describe('ParsingService', () => {
  describe('parseHtml', () => {
    it('should parse valid HTML', () => {
      const html = '<html><body><p>Hello World</p></body></html>';
      const $ = parsingService.parseHtml(html);
      expect($('p').text()).toBe('Hello World');
    });

    it('should throw on invalid input', () => {
      expect(() => parsingService.parseHtml(null)).toThrow();
      expect(() => parsingService.parseHtml('')).toThrow();
    });
  });

  describe('sanitizeText', () => {
    it('should clean HTML entities', () => {
      expect(parsingService.sanitizeText('Hello&nbsp;World')).toBe('Hello World');
      expect(parsingService.sanitizeText('&lt;tag&gt;')).toBe('<tag>');
    });

    it('should normalize whitespace', () => {
      expect(parsingService.sanitizeText('hello   world')).toBe('hello world');
      expect(parsingService.sanitizeText('  trim  ')).toBe('trim');
    });

    it('should handle empty input', () => {
      expect(parsingService.sanitizeText('')).toBe('');
      expect(parsingService.sanitizeText(null)).toBe('');
    });
  });

  describe('extractMetadata', () => {
    it('should extract Open Graph metadata', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Test Title">
            <meta property="og:description" content="Test Description">
            <meta property="og:image" content="https://example.com/image.jpg">
          </head>
          <body></body>
        </html>
      `;
      const $ = parsingService.parseHtml(html);
      const metadata = parsingService.extractMetadata($);

      expect(metadata.title).toBe('Test Title');
      expect(metadata.description).toBe('Test Description');
      expect(metadata.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should fallback to title tag', () => {
      const html = '<html><head><title>Page Title</title></head><body></body></html>';
      const $ = parsingService.parseHtml(html);
      const metadata = parsingService.extractMetadata($);

      expect(metadata.title).toBe('Page Title');
    });
  });

  describe('extractHeadings', () => {
    it('should extract all heading levels', () => {
      const html = `
        <article>
          <h1>Main Title</h1>
          <h2>Section 1</h2>
          <h3>Subsection</h3>
          <h2>Section 2</h2>
        </article>
      `;
      const $ = parsingService.parseHtml(html);
      const content = $('article');
      const headings = parsingService.extractHeadings($, content);

      expect(headings).toHaveLength(4);
      expect(headings[0]).toEqual({ level: 1, text: 'Main Title' });
      expect(headings[1]).toEqual({ level: 2, text: 'Section 1' });
      expect(headings[2]).toEqual({ level: 3, text: 'Subsection' });
    });
  });

  describe('extractQuotes', () => {
    it('should extract blockquotes', () => {
      const html = `
        <article>
          <blockquote>
            This is an important quote that spans multiple words.
            <cite>Author Name</cite>
          </blockquote>
        </article>
      `;
      const $ = parsingService.parseHtml(html);
      const content = $('article');
      const quotes = parsingService.extractQuotes($, content);

      expect(quotes).toHaveLength(1);
      expect(quotes[0].cite).toBe('Author Name');
    });

    it('should skip short quotes', () => {
      const html = '<article><blockquote>Short</blockquote></article>';
      const $ = parsingService.parseHtml(html);
      const content = $('article');
      const quotes = parsingService.extractQuotes($, content);

      expect(quotes).toHaveLength(0);
    });
  });

  describe('parse (full parsing)', () => {
    it('should parse a complete article', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Customer Success Story</title>
            <meta property="og:title" content="Acme Corp Improves 100x">
            <meta name="author" content="John Doe">
          </head>
          <body>
            <nav>Navigation</nav>
            <article>
              <h1>Acme Corp Improves 100x</h1>
              <p>This is the first paragraph of the customer story.</p>
              <p>This is the second paragraph with more details.</p>
              <blockquote>
                Our team saw incredible results after implementation.
                <cite>CEO, Acme Corp</cite>
              </blockquote>
              <h2>The Challenge</h2>
              <p>They faced many challenges before finding a solution.</p>
            </article>
            <footer>Footer content</footer>
          </body>
        </html>
      `;

      const result = parsingService.parse(html);

      expect(result.title).toBe('Acme Corp Improves 100x');
      expect(result.metadata.author).toBe('John Doe');
      expect(result.headings.length).toBeGreaterThan(0);
      expect(result.quotes.length).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.textOnly).not.toContain('Navigation');
      expect(result.textOnly).not.toContain('Footer content');
    });
  });
});
