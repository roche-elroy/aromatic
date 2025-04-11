interface Point {
  x: number;
  y: number;
}

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type Quadrant = 'left' | 'right' | null;

export const getQuadrant = (box: BoundingBox, screenWidth: number): Quadrant => {
  // Calculate center point of the bounding box
  const centerX = (box.x1 + box.x2) / 2;

  // Define quadrant boundary
  const midX = screenWidth / 2;

  // Determine left or right
  return centerX < midX ? 'left' : 'right';
};

export const getQuadrantDescription = (quadrant: Quadrant, targetLanguage: string): string => {
  const descriptions = {
    'left': {
      en: 'Object is on the left',
      hi: 'वस्तु बाईं ओर है'
    },
    'right': {
      en: 'Object is on the right',
      hi: 'वस्तु दाईं ओर है'
    }
  };

  return quadrant ? descriptions[quadrant][targetLanguage === 'hi' ? 'hi' : 'en'] : '';
};