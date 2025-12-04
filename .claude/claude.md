# BMAD Method with MCP Integration for Tax Genius Pro

## Project Context
Tax Genius Pro - An AI-powered tax preparation platform using Next.js 15.5.2, TypeScript, and modern tech stack.

## Available MCP Tools:

### 1. **Shadcn-UI MCP**
- **Purpose**: UI component management and installation
- **Commands**: Add, remove, and manage shadcn/ui components
- **Usage**: Building consistent UI with pre-built components

### 2. **Puppeteer MCP**
- **Purpose**: Browser automation, visual testing, screenshots
- **Commands**: Page navigation, element interaction, screenshot capture
- **Usage**: E2E testing, visual regression testing, automated browser tasks

### 3. **Firecrawl MCP**
- **Purpose**: Web scraping and data extraction
- **Commands**: Crawl websites, extract structured data
- **Usage**: Research, data gathering, competitive analysis

### 4. **Filesystem MCP**
- **Purpose**: Advanced file system operations
- **Commands**: Read, write, search, manage project files
- **Usage**: Code generation, file management, project structure

## Agent Assignments:

### **UI Designer Agent**
- Primary MCP: shadcn-ui
- Secondary: puppeteer (for visual testing)
- Focus: Component design, UI consistency, accessibility

### **QA Tester Agent**
- Primary MCP: puppeteer
- Secondary: filesystem (for test files)
- Focus: E2E testing, visual regression, test automation

### **Research Agent**
- Primary MCP: firecrawl
- Secondary: filesystem (for documentation)
- Focus: Tax law research, competitor analysis, data extraction

### **Developer Agent**
- Primary MCP: filesystem
- Secondary: All MCPs as needed
- Focus: Implementation, code generation, project structure

## Workflow Guidelines:

1. **Component Development**:
   - Use shadcn-ui MCP to add new components
   - Use puppeteer MCP to capture screenshots
   - Use filesystem MCP to organize component files

2. **Testing Workflow**:
   - Use puppeteer MCP for browser automation
   - Use filesystem MCP to manage test files
   - Capture visual snapshots for regression testing

3. **Research & Analysis**:
   - Use firecrawl MCP to gather tax-related information
   - Use filesystem MCP to store and organize research

4. **Code Generation**:
   - Use filesystem MCP for file operations
   - Use shadcn-ui MCP for UI components
   - Maintain consistent project structure

## Project-Specific Considerations:

- **Port Configuration**: Always use port 3005 for Tax Genius Pro
- **Security**: Never expose API keys or sensitive tax data
- **Compliance**: Ensure all implementations follow tax law requirements
- **Performance**: Optimize for large datasets and complex calculations

## MCP Integration Commands:

When working with MCPs in the project:
- Test MCP availability: `npx [mcp-package] --help`
- Check MCP status: Review mcp-settings.json
- Update configurations: Edit .env.mcp for API keys

## Error Handling:

If MCP tools fail:
1. Check API keys in .env.mcp
2. Verify package installation
3. Restart Cursor IDE
4. Check network connectivity
5. Review error logs in console

## Best Practices:

1. Always use the appropriate MCP for the task
2. Chain MCPs for complex workflows
3. Document MCP usage in code comments
4. Test MCP integrations before production
5. Keep API keys secure and rotate regularly