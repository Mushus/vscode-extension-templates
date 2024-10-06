const config = `name: {{templateName}}
description: Create a new {{templateName}}
params:
  - key: componentName
    description: Component name
    default: MyComponent
files:
  - path: "\\{{componentName}}.tsx"
    open: true
    content: |
      import React from 'react';

      type \\{{componentName}}Props = {};

      const \\{{componentName}}: React.FC<\\{{componentName}}Props> = () => {
        return <div>\\{{componentName}}</div>;
      };

      \\{{componentName}}.displayName = '\\{{componentName}}';

      export default \\{{componentName}};
  - path: "\\{{componentName}}.module.css"
    content: |
      .\\{{componentName}} {
        color: red;
      }
`;
export default config;
