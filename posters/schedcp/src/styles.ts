import { StyleSheet } from '@react-pdf/renderer';

// 24x36 inches in points (1 inch = 72 points)
export const PAGE_WIDTH = 24 * 72;  // 1728
export const PAGE_HEIGHT = 36 * 72; // 2592

// Color palette
export const colors = {
  primary: '#1e3a5f',      // Dark blue
  secondary: '#2563eb',    // Bright blue
  accent: '#059669',       // Green
  background: '#f8fafc',   // Light gray
  white: '#ffffff',
  text: '#1f2937',
  textLight: '#6b7280',
  headerBg: '#1e3a5f',
  sectionBg: '#ffffff',
  highlight: '#fef3c7',
};

export const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: colors.background,
    padding: 40,
    fontFamily: 'Helvetica',
  },

  // Header
  header: {
    backgroundColor: colors.headerBg,
    padding: 25,
    marginBottom: 20,
    borderRadius: 8,
  },
  title: {
    fontSize: 68,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 40,
    color: '#93c5fd',
    textAlign: 'center',
    marginBottom: 20,
  },
  authors: {
    fontSize: 32,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  affiliation: {
    fontSize: 26,
    color: '#d1d5db',
    textAlign: 'center',
  },

  // Main content layout
  content: {
    flexDirection: 'row',
    gap: 25,
    flex: 1,
  },
  column: {
    flex: 1,
    gap: 18,
  },

  // Section boxes
  section: {
    backgroundColor: colors.sectionBg,
    padding: 20,
    borderRadius: 8,
    borderLeft: `6px solid ${colors.secondary}`,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    borderBottom: `2px solid ${colors.secondary}`,
    paddingBottom: 6,
  },
  sectionContent: {
    fontSize: 24,
    color: colors.text,
    lineHeight: 1.5,
  },

  // Bullet points
  bulletList: {
    marginLeft: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    width: 24,
    fontSize: 24,
    color: colors.secondary,
  },
  bulletText: {
    flex: 1,
    fontSize: 24,
    color: colors.text,
    lineHeight: 1.4,
  },

  // Highlight box
  highlightBox: {
    backgroundColor: colors.highlight,
    padding: 15,
    borderRadius: 6,
    marginVertical: 10,
    borderLeft: `4px solid ${colors.accent}`,
  },
  highlightText: {
    fontSize: 26,
    color: colors.text,
    fontWeight: 'bold',
  },

  // Results box
  resultsBox: {
    backgroundColor: '#ecfdf5',
    padding: 15,
    borderRadius: 6,
    marginVertical: 8,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resultLabel: {
    fontSize: 26,
    color: colors.text,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.accent,
  },

  // Architecture diagram placeholder
  diagramBox: {
    backgroundColor: '#f1f5f9',
    padding: 20,
    borderRadius: 6,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  diagramText: {
    fontSize: 22,
    color: colors.textLight,
    textAlign: 'center',
  },

  // Two-column within section
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  },
  halfColumn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    borderLeft: `4px solid ${colors.secondary}`,
  },

  // Footer
  footer: {
    backgroundColor: colors.headerBg,
    padding: 15,
    marginTop: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 24,
    color: colors.white,
  },
  footerLink: {
    fontSize: 26,
    color: '#93c5fd',
    fontWeight: 'bold',
  },

  // Bold text
  bold: {
    fontWeight: 'bold',
  },

  // Small text
  small: {
    fontSize: 18,
    color: colors.textLight,
  },

  // Body text styles
  bodyText: {
    fontSize: 22,
    color: colors.text,
    lineHeight: 1.4,
  },
  bodyTextLarge: {
    fontSize: 24,
    color: colors.text,
    lineHeight: 1.4,
  },
  bodyTextSmall: {
    fontSize: 20,
    color: colors.text,
    lineHeight: 1.5,
  },
  subHeading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  caption: {
    fontSize: 18,
    textAlign: 'center',
    color: colors.textLight,
    marginTop: 5,
  },
});
