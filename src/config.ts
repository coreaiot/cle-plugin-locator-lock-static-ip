import { generateConfig } from './lib';

export const config = generateConfig({
  description: 'Locator Lock Static IP Plugin configurations.',
  fields: [
    {
      name: 'apiPrefix',
      type: 'dropdown',
      items: [
        {
          label: '/locators',
          value: '/locators',
        },
        {
          label: '/plugins/cle-plugin-locator-lock-static-ip',
          value: '/plugins/cle-plugin-locator-lock-static-ip',
        },
      ],
      description: 'API Prefix',
      value: '/locators',
    },
  ],
});