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
    padding: 30,
    marginBottom: 30,
    borderRadius: 8,
  },
  title: {
    fontSize: 72,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 36,
    color: '#93c5fd',
    textAlign: 'center',
    marginBottom: 20,
  },
  authors: {
    fontSize: 28,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  affiliation: {
    fontSize: 22,
    color: '#d1d5db',
    textAlign: 'center',
  },

  // Main content layout
  content: {
    flexDirection: 'row',
    gap: 30,
    flex: 1,
  },
  column: {
    flex: 1,
    gap: 25,
  },

  // Section boxes
  section: {
    backgroundColor: colors.sectionBg,
    padding: 25,
    borderRadius: 8,
    borderLeft: `6px solid ${colors.secondary}`,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
    borderBottom: `2px solid ${colors.secondary}`,
    paddingBottom: 8,
  },
  sectionContent: {
    fontSize: 20,
    color: colors.text,
    lineHeight: 1.5,
  },

  // Bullet points
  bulletList: {
    marginLeft: 15,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    width: 20,
    fontSize: 20,
    color: colors.secondary,
  },
  bulletText: {
    flex: 1,
    fontSize: 20,
    color: colors.text,
    lineHeight: 1.4,
  },

  // Highlight box
  highlightBox: {
    backgroundColor: colors.highlight,
    padding: 20,
    borderRadius: 6,
    marginVertical: 15,
    borderLeft: `4px solid ${colors.accent}`,
  },
  highlightText: {
    fontSize: 22,
    color: colors.text,
    fontWeight: 'bold',
  },

  // Results box
  resultsBox: {
    backgroundColor: '#ecfdf5',
    padding: 20,
    borderRadius: 6,
    marginVertical: 10,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 22,
    color: colors.text,
  },
  resultValue: {
    fontSize: 24,
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
    fontSize: 18,
    color: colors.textLight,
    textAlign: 'center',
  },

  // Two-column within section
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  halfColumn: {
    flex: 1,
  },

  // Footer
  footer: {
    backgroundColor: colors.headerBg,
    padding: 20,
    marginTop: 30,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 20,
    color: colors.white,
  },
  footerLink: {
    fontSize: 22,
    color: '#93c5fd',
    fontWeight: 'bold',
  },

  // Bold text
  bold: {
    fontWeight: 'bold',
  },

  // Small text
  small: {
    fontSize: 16,
    color: colors.textLight,
  },
});
