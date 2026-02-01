/**
 * Convert number to words in French (for invoices)
 * Example: 1000 -> "Mille dirhams"
 */

const units = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf']
const teens = ['Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf']
const tens = ['', '', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-dix', 'Quatre-vingt', 'Quatre-vingt-dix']

function convertHundreds(num: number): string {
  if (num === 0) return ''
  
  let result = ''
  const hundreds = Math.floor(num / 100)
  const remainder = num % 100

  if (hundreds > 0) {
    if (hundreds === 1) {
      result = 'Cent'
    } else {
      result = units[hundreds] + '-cent'
    }
    if (remainder > 0) {
      result += ' '
    }
  }

  if (remainder > 0) {
    if (remainder < 10) {
      result += units[remainder]
    } else if (remainder < 20) {
      result += teens[remainder - 10]
    } else {
      const tensDigit = Math.floor(remainder / 10)
      const unitsDigit = remainder % 10
      
      if (tensDigit === 7 || tensDigit === 9) {
        // Soixante-dix, Quatre-vingt-dix
        const base = tensDigit === 7 ? 60 : 80
        const extra = remainder - base
        if (extra === 0) {
          result += tens[tensDigit].toLowerCase()
        } else if (extra < 10) {
          result += tens[tensDigit === 7 ? 6 : 8].toLowerCase() + '-' + (extra === 1 ? 'et-' : '') + units[extra].toLowerCase()
        } else {
          result += tens[tensDigit === 7 ? 6 : 8].toLowerCase() + '-' + teens[extra - 10].toLowerCase()
        }
      } else {
        result += tens[tensDigit]
        if (unitsDigit > 0) {
          result += (unitsDigit === 1 ? '-et-' : '-') + units[unitsDigit].toLowerCase()
        } else if (tensDigit === 8) {
          result += 's' // Quatre-vingts
        }
      }
    }
  }

  return result.trim()
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zéro'
  
  // Handle decimals (cents)
  const integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)
  
  if (integerPart === 0) {
    // Only cents
    if (decimalPart === 0) return 'Zéro'
    return convertHundreds(decimalPart) + ' centime' + (decimalPart > 1 ? 's' : '')
  }
  
  let result = ''
  const millions = Math.floor(integerPart / 1000000)
  const thousands = Math.floor((integerPart % 1000000) / 1000)
  const hundreds = integerPart % 1000
  
  if (millions > 0) {
    if (millions === 1) {
      result = 'Un million'
    } else {
      result = convertHundreds(millions) + ' millions'
    }
    if (thousands > 0 || hundreds > 0) {
      result += ' '
    }
  }
  
  if (thousands > 0) {
    if (thousands === 1) {
      result += 'Mille'
    } else {
      result += convertHundreds(thousands) + ' mille'
    }
    if (hundreds > 0) {
      result += ' '
    }
  }
  
  if (hundreds > 0) {
    result += convertHundreds(hundreds)
  }
  
  // Capitalize first letter
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase()
  }
  
  // Add currency
  result += ' dirham' + (integerPart > 1 ? 's' : '')
  
  // Add cents if any
  if (decimalPart > 0) {
    result += ' et ' + convertHundreds(decimalPart).toLowerCase() + ' centime' + (decimalPart > 1 ? 's' : '')
  }
  
  return result
}
