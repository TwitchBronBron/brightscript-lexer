import { BrightScriptLexer, KeywordTokenTypes, MiscelaneousTokenTypes, SymbolTokenTypes, SymbolTokenTypeValues, Token, TokenType } from './BrightScriptLexer';
let lexer: BrightScriptLexer;
beforeEach(() => {
    lexer = new BrightScriptLexer();
    jasmine.addMatchers({
        toEqualCustom: function (util, customEqualityTesters) {
            return {
                compare: function (actual: any, expected: any) {
                    let result = {
                        message: <string | undefined>undefined,
                        pass: true
                    };
                    result.pass = util.equals(actual, expected[0]);
                    if (result.pass === false) {
                        result.message = `Expected '${actual}' to equal '${expected[0]}' for '${expected[1]}'`;
                    }
                    return result;
                },
                negativeCompare: function (actual: any, expected: any) {
                    let result = {
                        message: <string | undefined>undefined,
                        pass: true
                    };
                    result.pass = !util.equals(actual, expected[0]);
                    if (result.pass === false) {
                        result.message = `Expected '${actual}' not to equal '${expected[0]}' for '${expected[1]}'`;
                    }
                    return result;
                }
            };
        }
    });
});
function matchMany(tokenType: TokenType, textItems: string[]) {
    for (let text of textItems) {
        let match = lexer.getMatch(text);
        (expect(match ? match.tokenType : undefined) as any).toEqualCustom([tokenType, text]);
    }
}
function notMatchMany(tokenType: TokenType, textItems: string[]) {
    for (let text of textItems) {
        let match = lexer.getMatch(text);
        (expect(match ? match.tokenType : undefined) as any).not.toEqualCustom([tokenType, text]);
    }
}
function fkeywordIt(tokenType: TokenType) {
    keywordIt(tokenType, true);
}
function keywordIt(tokenType: TokenType, exclusive = false) {
    let method = exclusive ? fit : it;
    method(tokenType, () => {
        matchMany(tokenType, [tokenType.toLowerCase(), tokenType.toUpperCase(), `${tokenType} `]);
        notMatchMany(tokenType, [` ${tokenType}`, `${tokenType}WithOtherWord`, `wordThen${tokenType}`]);
    });
}
function fsymbolIt(symbol: string, tokenType: TokenType) {
    symbolIt(symbol, tokenType, true);
}
function symbolIt(symbol: string, tokenType: TokenType, exclusive = false) {
    let method = exclusive ? fit : it;
    method(tokenType, () => {
        matchMany(tokenType, [symbol, `${symbol},`, `${symbol})(`, `${symbol}Something`]);
        notMatchMany(tokenType, [` ${symbol}`, `something${symbol}`]);
    });
}

it('all tokens are placed into a bucket', () => {
    let allTokenTypes: TokenType[] = [];
    for (let tokenType in TokenType) {
        allTokenTypes.push(<TokenType>tokenType);
    }

    //test that every symbol is represented in a bucket
    let buckets = [
        KeywordTokenTypes,
        SymbolTokenTypes,
        MiscelaneousTokenTypes
    ];

    for (let bucket of buckets) {
        for (let tokenType of bucket) {
            let index = allTokenTypes.indexOf(tokenType);
            if (index > -1) {
                allTokenTypes.splice(index, 1);
            }
        }
    }
    expect(allTokenTypes).toEqual([]);
});

it('all tokens have a token definition', () => {
    let allTokenTypes: TokenType[] = [];
    for (let tokenType in TokenType) {
        allTokenTypes.push(<TokenType>tokenType);
    }

    for (let tokenDefinition of ((lexer as any).tokenDefinitions as { tokenType: TokenType }[])) {
        let index = allTokenTypes.indexOf(tokenDefinition.tokenType);
        if (index > -1) {
            allTokenTypes.splice(index, 1);
        }
    }
    //the only tokens that should not have a definition are the EOF and INVALID_TOKEN tokens
    expect(allTokenTypes).toEqual([TokenType.END_OF_FILE, TokenType.INVALID_TOKEN]);
});

describe('BrightscriptLexer', () => {
    describe('getMatch() works for --', () => {
        for (let keywordTokenType of KeywordTokenTypes) {
            keywordIt(keywordTokenType);
        }

        for (let tokenType in SymbolTokenTypeValues) {
            let symbol = SymbolTokenTypeValues[tokenType];
            symbolIt(symbol, <TokenType>tokenType);
        }

        it('booleanLiteral', () => {
            matchMany(TokenType.booleanLiteral, ['true', 'TRUE', 'true)', 'false', 'FALSE', 'false)']);
            notMatchMany(TokenType.booleanLiteral, [' true', ' false', 'trueVar', 'falseVar']);
        });

        it('stringLiteral', () => {
            matchMany(TokenType.stringLiteral, ['"cat"', '"cat" ', '"cat")']);
            notMatchMany(TokenType.stringLiteral, ['"cat', ' "cat"', 'cat"']);
        });

        it('numberLiteral', () => {
            matchMany(TokenType.numberLiteral, ['1', '123', '1 ']);
            notMatchMany(TokenType.numberLiteral, ['a1', ' 123', '+1', '-1']);
        });

        it('identifier', () => {
            matchMany(TokenType.identifier, ['a', '_a', '_a_', '__aa', 'a_', 'a1', '_a1', 'a1_']);
            notMatchMany(TokenType.identifier, ['1a', ' a', '', '*&^']);
        });

        it('whitespace', () => {
            matchMany(TokenType.whitespace, [' ', '\t', '   ', '\t ', '     ', ' \t ']);
            notMatchMany(TokenType.whitespace, ['\n', 'a ', '\r', '\r\n', '\n\r']);
        });

        it('newline', () => {
            matchMany(TokenType.newline, ['\n', '\r', '\r\n', '\n\r', '\n ']);
            notMatchMany(TokenType.newline, ['a\n', ' \r']);
        });
    });

    describe('tokenize', () => {
        it('comment tokens do not include newline character', () => {
            let tokens;

            tokens = lexer.tokenize(`'some comment'\n`);
            expect(tokens[0].tokenType).toEqual(TokenType.quoteComment);
            expect(tokens[1].tokenType).toEqual(TokenType.newline);

            tokens = lexer.tokenize(`REMsome comment'\n`);
            expect(tokens[0].tokenType).toEqual(TokenType.remComment);
            expect(tokens[1].tokenType).toEqual(TokenType.newline);
        });

        it('should find invalid tokens', () => {
            let program = 'k = #';
            let tokens = lexer.tokenize(program);
            expect(tokens[4].tokenType).toEqual(TokenType.INVALID_TOKEN);
        });

        it('should not add extra newlines', () => {
            let program = `sub Main()\r\n    showChannelSGScreen()\r\n    end sub`;
            let tokens = lexer.tokenize(program);
            let types: TokenType[] = [];
            for (let token of tokens) {
                types.push(token.tokenType);
            }
            expect(types).toEqual([
                TokenType.sub,
                TokenType.whitespace,
                TokenType.identifier,
                TokenType.openParenSymbol,
                TokenType.closeParenSymbol,
                TokenType.newline,
                TokenType.whitespace,
                TokenType.identifier,
                TokenType.openParenSymbol,
                TokenType.closeParenSymbol,
                TokenType.newline,
                TokenType.whitespace,
                TokenType.endSub,
                TokenType.END_OF_FILE
            ]);
        });

        it('should combine back to the original program', () => {
            let program = `
                sub DoSomething()
                    k = 2
                end sub
            `;
            let tokens = lexer.tokenize(program);
            expect(stringify(tokens)).toEqual(program);
            let types: TokenType[] = [];
            for (let token of tokens) {
                types.push(token.tokenType);
            }
            expect(types).toEqual([
                TokenType.newline,
                TokenType.whitespace,
                TokenType.sub,
                TokenType.whitespace,
                TokenType.identifier,
                TokenType.openParenSymbol,
                TokenType.closeParenSymbol,
                TokenType.newline,
                TokenType.whitespace,
                TokenType.identifier,
                TokenType.whitespace,
                TokenType.equalSymbol,
                TokenType.whitespace,
                TokenType.numberLiteral,
                TokenType.newline,
                TokenType.whitespace,
                TokenType.endSub,
                TokenType.newline,
                TokenType.whitespace,
                TokenType.END_OF_FILE
            ]);
        });
    });
});

function stringify(tokens: Token[]) {
    let result = '';
    for (let token of tokens) {
        result += token.value ? token.value : '';
    }
    return result;
}