# 微信小程序简易编译打包工具

简易的小程序构建工具

## Demos

- [Default Template](https://github.com/DavidKk/wcmpack/tree/master/sources/templates/default)


## Features

- 支持 分离脚本样式等文件 与 静态资源等媒体文件
  - 媒体等资源文件需要在生产环境中需要配置 Nginx 才能访问(略)
  - 自动添加 hash (不可修改, 详情见下面文件依赖导入)
- 支持 自定义配置 (自带, [默认使用见](https://github.com/DavidKk/wcmpack/tree/master/src/constants))
  - [默认配置修改参考见](https://github.com/DavidKk/wcmpack/tree/master/src/optionManager.js)
- 支持 Babel (自带, 默认使用本地 .babelrc 配置, [详情见](https://github.com/DavidKk/wcmpack/tree/master/src/loaders/babel.js))
- 支持 node_modules 递归遍历导入 (自带, [详情见](https://github.com/DavidKk/wcmpack/tree/master/src/loaders/linkage.js))
  - 每次修改都是全文件重新编译
  - 依赖并不 cache 任何依赖情况, 所以编译会比较慢
  - 这里注意小程序并不支持 require 相互引入, 且必然会导致无限循环
    - 在 babel 某些库会出现相互引用方法, 这里注意检查
  - 支持 相互引入导致无限循环提示
- 支持 替换式变量 (自带, 类似 Webpack.DefinePlugin, [配置参考见](https://github.com/DavidKk/wcmpack/tree/master/src/constants/common.config.js))
- 支持 SASS (自带, 默认使用 SCSS)
  - 支持背景图片导入 (详细看下面文件依赖导入)
- 支持 文件依赖导入 (自带, [详情使用见](https://github.com/DavidKk/wcmpack/tree/master/src/loaders/file.js))
  - 支持 alias { ~: srcDir, /: rootDir, .: relativeDir }
    - 建议使用相对地址, 使用 VSCode 等可以快捷查看文件状态或预览文件
  - 支持 追加文件 Hash 码 `file.[hash].png` (默认, 没法自定义, 存在所有环境中)
  - 支持 WXML, HTML `<image src="../../panels/logo.png" />`
  - 支持 WXS, SCSS, CSS `background-image: url("../../panels/logo.png")`
  - 支持 JS `require('../../panels/logo.png')`
  - 支持 WXSS `require('../../panels/logo.png')`
  - 可自定义规则 (具体参考下方)
  - 生产环境注意更改 `publicPath` 值 ([具体参考见](https://github.com/DavidKk/wcmpack/tree/master/src/optionManager.js))
- 支持 压缩文件 (自带, 默认仅在生产环境使用)
- 支持 精灵图插件 (自带, [详情使用见](https://github.com/DavidKk/wcmpack/tree/master/src/plugins/spritesmith.js))
  - 图片是缩小 50% (默认), 若要修改可以修改样式模板, 所以请导出图片的时候放大 1倍
  - 样式使用百分比, 自带自适应 (默认)
  - 自定义样式配置可在 `root/src/sprites/sprite.scss.template.handlebars` 创建 (自定义修改配置自己分配, 暂时只支持 handlebars 模板)
  - 注意精灵图样式并不会自动导入, 在全局样式中必须导入 `@import "../.temporary/sprites/sprite";`
  - 需要修改必须写在 `src/sprites/` 文件中 (若不更改配置目录)
  - [默认模板](https://github.com/DavidKk/wcmpack/tree/master/sources/sprite.scss.template.handlebars)
- 支持 自动复制 JSON 文件
- 支持 静态服务器 (自带, 默认仅在开发环境使用, [详情见](https://github.com/DavidKk/wcmpack/tree/master/src/plugins/staticServer.js))
  - 机器若与手机在同一内网环境中则可以访问, 手机无需做任何代理
- 可自定义插件(Plugins)与编译器(Loaders) (默认, [事例参考](https://github.com/DavidKk/wcmpack/tree/master/src/plugins/))


## Install and Use

```
npm install -g wcmpack        # or use yarn or others...
wcmpack init demo             # initialize project
wcmpack development --watch   # for development environment
wcmpack production            # for production environment
wcmpack unitest               # can not use now
```

暂时并不支持单元测试

### Other features

其他功能参考

```
wcmpack --help
```

### Note

- 项目需要按微信小程序官方指定的方式去配置, JSON 文件会自动复制到项目中
- 结果文件将分成两部分, 分别存在两个目录下
  - app (默认, 可修改见配置)
    - 通过官方模拟器可以指定该文件
  - static (默认, 可修改见配置)
- static 目录在生产环境可能需要配置 Nginx 等服务才能访问
- 需要编译或者其他不需要编译但需要复制的文件, 可以配置 Rule
  - 只配置 test: /\.wxs$/ 不配置任何 loader
- 注意 WXS 文件并不能导入任何 node_modules 中的东西所以不要编译这类文件
- 注意 Component 不读取公共样式; 因此精灵图样式, 全局样式等可能需要各自导入各自自定义组件中 (并不建议)

## Others

### 精灵图样式必须自行执行, 以下是例子:

```
@import "../.temporary/sprites/sprite";

@if mixin-exists(sprites) and global-variable-exists('spritesheet-sprites') {
  .sp {
    display: inline-block;
    transition: all .35s ease-in-out;
  }

  @include sprites($spritesheet-sprites);
}
```

### 静态文件引入规则自定义, 可配置

[默认配置参考](https://github.com/DavidKk/wcmpack/blob/master/src/loaders/file.js#L16)

```
export default {
  rules: {
    test: /\.custom$/,
    loaders: [
      {
        use: require.resolve('../loaders/file'),
        options: {
          rules: {
            // from `import "a.png"` to `import 'http://192.168.1.1/../a.png'`
            '.custom': /import ["']?([^"'\s]+)["']?;/g
            // from `include("aa.png")` to `'http://192.168.1.1/../a.png'`
            '.extname': {
              regexp: /include\(["']?([^"'\s]+)["']?\)/g,
              replace (source, string, url) {
                let escapeRegExp = toEscapeRegExp(string)
                let regexp = new RegExp(escapeRegExp, 'g')
                return source.replace(regexp, `'${url}'`)
              }
            }
          }
        }
      }
    ]
  }
}
```