import { generateStatus } from "./lib";

export const status = generateStatus({
  fields: [
    {
      name: 'status',
      description: 'Status',
      value: 'idle' as string,
    },
  ],
  getResult(obj) {
    if (obj.status !== 'idle')
      return 'buzy';
    return 'idle'
  },
  getStyle(obj, key) {
    switch (key) {
      case 'result':
      case 'status':
        if (obj.status !== 'idle') return 'secondary';
        return 'success';
      default:
        return '';
    }
  },
});
