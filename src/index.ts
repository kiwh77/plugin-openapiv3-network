import Fs from 'fs'
import Path from 'path'
import { fileURLToPath } from 'url'
import Handlebars from 'handlebars'
import 'handlebars-helpers'

import { OpenApisV3 } from './schema'

export default class OpenApiV3 {
  name = 'OpenApiV3'

  templates: {
    name: string
    template: string
    encoding?: string
  }[]

  constructor() {
    this.templates = this._getTemplates()
  }

  private _getTemplates() {
    const dirName = Path.dirname(fileURLToPath(import.meta.url))
    return [
      {
        name: 'service.ts',
        template: Fs.readFileSync(
          Path.resolve(dirName, './templates/service.hbs'),
          {
            encoding: 'utf-8'
          }
        )
      },
      {
        name: 'network.ts',
        template: Fs.readFileSync(
          Path.resolve(dirName, './templates/network.hbs'),
          {
            encoding: 'utf-8'
          }
        )
      },
      {
        name: 'entity.ts',
        template: Fs.readFileSync(
          Path.resolve(dirName, './templates/entity.hbs'),
          {
            encoding: 'utf-8'
          }
        )
      }
    ]
  }

  /**
   * 多条数据时合并
   * @param contents
   */
  merge(
    module: any,
    ctx: Partial<OpenApisV3.SchemaJson> = {
      paths: {},
      tags: [],
      servers: []
    }
  ) {
    const content = module.sources
    if (!content) return ctx

    const result = ctx
    let contents: OpenApisV3.SchemaJson[] = []

    if (Object.prototype.toString.apply(content) === '[object Object]') {
      contents = [content as OpenApisV3.SchemaJson]
    } else if (Array.isArray(content)) {
      contents = content
    }
    contents.forEach(item => {
      result.openapi = result.openapi || item.openapi

      result.info = result.info || item.info
      result.paths = {
        ...result.paths,
        ...item.paths
      }
      result.tags = [...result.tags, ...item.tags]
      result.servers = [...result.servers, ...item.servers]
      result.components = {
        ...(result.components || []),
        ...item.components
      }
    })

    return result
  }

  /**
   * 数据转换
   * @param content OpenApisV3规范的JSON数据
   * @returns 转换后的适应模板需要的数据
   */
  convert(module: any, result: Array<string> = []) {
    const sources = module.sources
    if (!sources) return result

    return [
      ...result,
      ...sources.map((source: OpenApisV3.SchemaJson) =>
        this.compile(this.transform(source))
      )
    ]
  }

  transform(source: OpenApisV3.SchemaJson) {
    return {
      paths: Object.keys(source?.paths)
        .sort((a, b) => (a > b ? 1 : -1))
        .reduce((total, url) => {
          const value = source.paths[url] as any
          Object.keys(value).forEach(method => {
            const methodValue = value[method]
            total.push({
              name: methodValue.operationId,
              description: methodValue.summary,
              url,
              method,
              requestBody: methodValue.RequestBody,
              responses: methodValue.responses,
              tags: methodValue.tags
                .map((tag: string) => `\'${tag}\'`)
                .join(', '),
              security: methodValue.security
            })
          })
          return total
        }, [])
    }
  }

  /**
   * 根据模板编译
   * @param content 符合模板要求的数据
   * @returns 根据模板生成的数据
   */
  compile(content: { [key: string]: any }) {
    return this.templates.map(item => ({
      name: item.name,
      content: Handlebars.compile(item.template)(content)
    }))
  }
}
