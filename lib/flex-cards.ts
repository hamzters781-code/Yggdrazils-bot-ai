export function menuCard(items: { name: string; price: number }[]) {
  return {
    type: 'flex' as const,
    altText: 'รายการสินค้า',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: 'รายการสินค้า', weight: 'bold', size: 'xl' }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: items.map((item) => ({
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: item.name, size: 'md', flex: 3 },
            { type: 'text', text: `${item.price} ฿`, size: 'md', align: 'end', color: '#C0533A', weight: 'bold', flex: 1 },
          ],
        })),
      },
    },
  };
}
