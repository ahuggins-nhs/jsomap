import { JSOMacro } from './JSOMacro'

/**
 * @class
 */
export class JSOMap {
  /**
   * @description Class for safely querying javascript objects, parsing a map object to produce a transformed object.
   * @param {object} [input] - An object to query.
   * @param {object} [map] - An object of key/query pairs.
   * @example
   * console.log(new JSOMap({ text: 'Hello, world!' }, { print: '[text]' }))
   */
  constructor (input: any, map: any) {
    this.input = input
    this.map = map
  }

  private readonly input: any
  private readonly map: any

  /**
   * @static
   * @description Method for querying data from Javascript objects and/or primitives.
   * @param {object} input - Object to select or manipulate data from.
   * @param {string} queryStr - Query string for selecting or manipulating input.
   * @returns {any} Returns any value selected or manipulated from the input.
   */
  static query (input: any, queryStr: string): any {
    const queryRx = /(?:\[|]\[|])/
    let result: any = ''

    // Test to see if string is a macro string.
    if (JSOMacro.RX.test(queryStr)) {
      const macro: string = queryStr.substring(1, queryStr.length - 1)
      const pipe: string[] | string = JSOMacro.pipeMacro(macro)

      // Pipe macro results one to the next.
      if (Array.isArray(pipe)) {
        pipe.forEach(function handlePipe (qry, idx) {
          if (JSOMacro.MacroDefRX.test(`${qry.split(JSOMacro.MacroNameRX)[0]}()`)) {
            result = idx === 0 ? JSOMap.query(input, `{${qry}}`) : JSOMap.query(result, `{${qry}}`)
          } else if (queryRx.test(qry)) {
            result = idx === 0 ? JSOMap.query(input, qry) : JSOMap.query(result, qry)
          } else {
            result = idx === 0 ? JSOMap.query(input, qry) : JSOMap.query(result, qry)
          }
        })

        // Otherwise, resolve individual macros.
      } else {
        result = JSOMacro.getMacro(macro)(input, queryStr)
      }

      // If it is a plain query to select data from the input object.
    } else if (queryRx.test(queryStr)) {
      const qPath = queryStr.split(queryRx)

      qPath
        .filter(part => part !== '')
        .forEach(function handleQueryPart (part: any, index: number) {
          const numericRx = /[0-9]+/
          if (numericRx.test(part)) {
            const numberPart = parseFloat(part)

            part = isNaN(numberPart) ? part : numberPart
          }

          if (result === '' && index === 0) {
            result = input[part]
          } else if (Array.isArray(result)) {
            if (typeof part === 'number') {
              result = result[part]

              if (result === undefined) result = ''
            } else {
              result = result.map(res => res[part])
            }
          } else {
            result = result[part]

            if (result === undefined) result = ''
          }
        })

      // Anything not matching the macro or query syntax.
    } else {
      result = queryStr
    }

    return result
  }

  /**
   * @static
   * @description Method for dynamically adding macros.
   * Macros must be added before parsing or querying; if not, the macros will not be used.
   * @param {string|object} name - The string name of the macro or an object containing multiple macros.
   * @param {Function} [macro] - If a string name is provided, macro must be a Function.
   * @example
   * JSOMap.addMacro('LowerCase()', (input) => input.toLowerCase())
   * @example
   * JSOMap.addMacro({
   *   'LowerCase()': (input) => input.toLowerCase(),
   *   'UpperCase()': (input) => input.toUpperCase()
   * })
   */
  static addMacro (name: string | any, macro?: Function): void {
    JSOMacro.addMacro(name, macro)
  }

  /**
   * @static
   * @description Method for parsing a JSOMap and transforming the provided input.
   * @param {object} input - An object to map data from.
   * @param {object} map - An object of queries to transform input.
   * @returns {any} The transformed object.
   */
  static parse (input: any, map: any): any {
    const result: any = Array.isArray(map) ? [] : {}
    map = Array.isArray(map) ? map[0] : map

    Object.keys(map).forEach(function handleMapKey (key) {
      if (Array.isArray(map) || typeof map[key] === 'object') {
        result[key] = JSOMap.parse(input, map[key])
      } else {
        const value = JSOMap.query(input, map[key])

        if (Array.isArray(result) && Array.isArray(value)) {
          for (let i = 0; i < value.length; i += 1) {
            result[i] = Object.assign(
              {
                [`${key}`]: value[i]
              },
              result[i]
            )
          }
        } else if (Array.isArray(result)) {
          if (result.length > 0) {
            for (let i = 0; i < result.length; i += 1) {
              result[i] = Object.assign(
                {
                  [`${key}`]: value
                },
                result[i]
              )
            }
          } else {
            result[0] = {
              [`${key}`]: value
            }
          }
        } else {
          result[key] = value
        }
      }
    })

    return result
  }

  /**
   * @description Get the result of mapping the input and map in this instance.
   * @returns {any} The transformed object.
   */
  mapped (): any {
    return JSOMap.parse(this.input, this.map)
  }

  /**
   * @private
   * @description Get the result of mapping the input and map in this instance.
   * @returns {any} The transformed object.
   */
  toObject (): any {
    return this.mapped()
  }

  /**
   * @private
   * @description Get the result of mapping the input and map in this instance.
   * @returns {any} The transformed object.
   */
  valueOf (): any {
    return this.mapped()
  }

  /**
   * @private
   * @description Get the result of mapping the input and map in this instance.
   * @returns {any} The transformed object.
   */
  [Symbol.for('nodejs.util.inspect.custom')] (): any {
    return this.valueOf()
  }
}
