# 微信小程序简易编译打包工具

简易的编译工具, 建议刚接触的开发人员可以使用, 没有额外的学习成本, 使用小程序官方最简单的开发方式/流程


## Features

- 支持 分离脚本样式等文件 与 静态资源等媒体文件
- 支持 自定义配置 (自带, [默认使用见](https://github.com/DavidKk/wcmpack/tree/master/src/constants))
  - [默认配置修改参考见](https://github.com/DavidKk/wcmpack/tree/master/src/optionManager.js)
- 支持 Babel (自带, 默认使用本地 .babelrc 配置, [详情见](https://github.com/DavidKk/wcmpack/tree/master/src/loaders/babel.js))
- 支持 node_modules 递归遍历导入 (自带, [详情见](https://github.com/DavidKk/wcmpack/tree/master/src/loaders/linkage.js))
  - 每次修改都是全文件重新编译
  - 依赖并不 cache 任何依赖情况, 所以编译会比较慢
  - 这里注意小程序并不支持 require 相互引入, 且必然会导致无限循环
  - 暂不支持 相互引入导致无限循环提示
- 支持 替换式变量 (自带, 类似 Webpack.DefinePlugin, [配置参考见](https://github.com/DavidKk/wcmpack/tree/master/src/constants/common.config.js))
- 支持 SASS (自带, 默认使用 SCSS)
  - 支持背景图片导入 (详细看下面文件依赖导入)
- 支持 文件依赖导入 (自带, [详情使用见](https://github.com/DavidKk/wcmpack/tree/master/src/loaders/file.js))
  - 支持 alias { ~: srcDir, /: rootDir, .: relativeDir }
    - 建议使用相对地址, 使用 VSCode 等可以快捷查看文件状态或预览文件
  - 支持 追加文件 Hash 码 `file.[hash].js` (默认, 没法自定义, 存在所有环境中)
  - 支持 WXML `<image src="../../panels/logo.png" />`
  - 支持 SCSS `background-image: url("../../panels/logo.png")`
  - 暂时不支持 JS `require('../../panels/logo.png')`
  - 生产环境注意更改 `publicPath` 值 ([具体参考见](https://github.com/DavidKk/wcmpack/tree/master/src/optionManager.js))
- 支持 压缩文件 (自带, 默认仅在生产环境使用)
- 支持 精灵图插件 (自带, [详情使用见](https://github.com/DavidKk/wcmpack/tree/master/src/plugins/spritesmith.js))
  - 样式使用百分比, 自带自适应 (默认)
  - 自定义样式配置可在 `root/src/sprites/sprite.scss.template.handlebars` 创建 (自定义修改配置自己分配, 暂时只支持 handlebars 模板)
  - 注意精灵图样式并不会自动导入, 在全局样式中必须导入 `@import "../.temporary/sprites/sprite";`
- 支持 自动 copy JSON 文件
- 支持 静态服务器 (自带, 默认仅在开发环境使用, [详情见](https://github.com/DavidKk/wcmpack/tree/master/src/plugins/staticServer.js))
  - 机器若与手机在同一内网环境中则可以访问, 手机无需做任何代理
- 可自定义插件(Plugins)与编译器(Loaders) (默认, [事例参考](https://github.com/DavidKk/wcmpack/tree/master/src/plugins/))


## Install and Use

```
npm install -g wcmpack        # or use yarn or others...
wcmpack development --watch   # for development environment
wcmpack production            # for production environment
wcmpack unitest               # can not use now
```

暂时并不支持单元测试

其他的具体用法参考

```
wcmpack --help
```

- 项目需要按微信小程序官方指定的方式去配置, JSON 文件会自动复制到项目中
- 结果文件将分成两部分, 分别存在两个目录下
  - app (默认, 可修改见配置)
  - static (默认, 可修改见配置)
- static 目录在生产环境可能需要配置 Nginx 等服务才能访问
- 需要编译或者其他不需要编译但需要复制的文件, 可以配置 Rule
  - 只配置 test: /\.wxs$/ 不配置任何 loader
- 注意 WXS 文件并不能导入任何 node_modules 中的东西所以不要编译这类文件
- 注意 Component 不读取公共样式; 因此精灵图样式, 全局样式等可能需要各自导入各自自定义组件中 (并不建议)


## 目录结构

默认路径, 可修改, 详情见配置

```
/src
  /sprites
  /... others directories
  /app.js
  /app.json
  /app.scss
  /project.config.json

```