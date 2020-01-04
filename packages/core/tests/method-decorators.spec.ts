import 'jest';
import 'jest-extended';
import 'reflect-metadata';
import {f, getClassSchema, PartialField} from "../src/decorators";
import {
    argumentClassToPlain,
    argumentPlainToClass,
    methodResultClassToPlain,
    methodResultPlainToClass,
    plainToClass,
    validateMethodArgs
} from "..";

test('Basic array', () => {
    class Other {
    }

    class Controller {
        @f.array(Other).decorated()
        protected readonly bar: Other[] = [];
    }

    const s = getClassSchema(Controller);
    {
        const prop = s.getProperty('bar');
        expect(prop.name).toBe('bar');
        expect(prop.type).toBe('class');
        expect(prop.classType).toBe(Other);
        expect(prop.isArray).toBe(true);
    }
});

test('short @f 2', () => {
    class Controller {
        public foo(@f.array(String) bar: string[]): string {
            return '';
        }

        @f.array(Number)
        public foo2(@f.map(String) bar: { [name: string]: string }): number[] {
            return [];
        }
    }

    const s = getClassSchema(Controller);
    {
        const method = s.getMethod('foo');
        expect(method.name).toBe('foo');
        expect(method.type).toBe('string');
        expect(method.isArray).toBe(false);

        const props = s.getMethodProperties('foo');

        expect(props).toBeArrayOfSize(1);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');
        expect(props[0].isArray).toBe(true);
    }

    {
        const method = s.getMethod('foo2');
        expect(method.name).toBe('foo2');
        expect(method.type).toBe('number');
        expect(method.isArray).toBe(true);

        const props = s.getMethodProperties('foo2');

        expect(props).toBeArrayOfSize(1);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');
        expect(props[0].isMap).toBe(true);
    }
    {
        const errors = validateMethodArgs(Controller, 'foo', []);
        expect(errors.length).toBe(1);
        expect(errors[0].code).toBe('required');
        expect(errors[0].message).toBe('Required value is undefined');
        expect(errors[0].path).toBe('#0');
    }
    {
        const errors = validateMethodArgs(Controller, 'foo', ['asd']);
        expect(errors.length).toBe(1);
        expect(errors[0].code).toBe('invalid_type');
        expect(errors[0].message).toBe('Invalid type. Expected array, but got string');
        expect(errors[0].path).toBe('#0');
    }
    {
        const errors = validateMethodArgs(Controller, 'foo', [['asd']]);
        expect(errors.length).toBe(0);
    }
    {
        const errors = validateMethodArgs(Controller, 'foo', [[1]]);
        expect(errors.length).toBe(1);
        expect(errors[0].code).toBe('invalid_string');
        expect(errors[0].message).toBe('No String given');
        expect(errors[0].path).toBe('#0.0');
    }
    {
        const errors = validateMethodArgs(Controller, 'foo', [[{'asd': 'sa'}]]);
        expect(errors.length).toBe(1);
        expect(errors[0].code).toBe('invalid_string');
        expect(errors[0].message).toBe('No String given');
        expect(errors[0].path).toBe('#0.0');
    }
});

test('short @f unmet array definition', () => {
    expect(() => {
        class Controller {
            public foo(@f bar: string[]) {
            }
        }
    }).toThrow('Controller::foo::0 type mismatch. Given nothing, but declared is Array')
});

test('short @f no index on arg', () => {
    expect(() => {
        class Controller {
            public foo(@f.index() bar: string[]) {
            }
        }
    }).toThrow('Index could not be used on method arguments')
});

test('method args', () => {
    class Controller {
        public foo(@f bar: string) {
        }

        public foo2(@f bar: string, optional?: true, @f.optional() anotherOne?: boolean) {
        }
    }

    const s = getClassSchema(Controller);
    {
        const props = s.getMethodProperties('foo');

        expect(props).toBeArrayOfSize(1);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');
    }

    {
        const props = s.getMethodProperties('foo2');

        expect(props).toBeArrayOfSize(3);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');

        expect(props[1].name).toBe('1');
        expect(props[1].type).toBe('boolean');

        expect(props[2].name).toBe('2');
        expect(props[2].type).toBe('boolean');
        expect(props[2].isOptional).toBe(true);
    }
    {
        const errors = validateMethodArgs(Controller, 'foo2', ['bar']);
        expect(errors.length).toBe(1);
        expect(errors[0].code).toBe('required');
        expect(errors[0].message).toBe('Required value is undefined');
        expect(errors[0].path).toBe('#1');
    }
    {
        const errors = validateMethodArgs(Controller, 'foo2', ['bar', true]);
        expect(errors.length).toBe(0);
    }
});


test('short @f', () => {
    class Controller {
        public foo(@f bar: string) {
        }
    }

    const s = getClassSchema(Controller);
    {
        const props = s.getMethodProperties('foo');

        expect(props).toBeArrayOfSize(1);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');
        expect(props[0].isArray).toBe(false);
    }
});


test('short @f multi', () => {
    class Controller {
        public foo(@f bar: string, @f foo: number) {
        }
    }

    const s = getClassSchema(Controller);
    {
        const props = s.getMethodProperties('foo');

        expect(props).toBeArrayOfSize(2);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');
        expect(props[0].isArray).toBe(false);

        expect(props[1].name).toBe('1');
        expect(props[1].type).toBe('number');
        expect(props[1].isArray).toBe(false);
    }
});


test('no decorators', () => {
    expect(() => {
        class Controller {
            public foo(bar: string, nothing: boolean) {
            }
        }

        const s = getClassSchema(Controller);
        s.getMethodProperties('foo');

    }).toThrow('Method foo has no decorators used, so reflection does not work');
});

test('partial', () => {
    class Config {
        @f.optional()
        name?: string;

        @f.optional()
        sub?: Config;

        @f
        prio: number = 0;
    }

    class User {
        @f.partial(Config)
        config: Partial<Config> = {};

        @f.forwardPartial(() => Config)
        config2: Partial<Config> = {};
    }

    const s = getClassSchema(User);
    expect(s.getProperty('config').isPartial).toBe(true);
    expect(s.getProperty('config').getResolvedClassType()).toBe(Config);

    expect(s.getProperty('config2').isPartial).toBe(true);
    expect(s.getProperty('config2').getResolvedClassType()).toBe(Config);

    const u = plainToClass(User, {
        config: {
            name: 'peter',
            'sub.name': 'peter2',
            'sub.prio': '3',
        }
    });

    expect(u.config).not.toBeInstanceOf(Config);
    expect(u.config.name).toBe('peter');
    expect(u.config.prio).toBeUndefined();
    expect(u.config['sub.name']).toBe('peter2');
    expect(u.config['sub.prio']).toBe(3);
});

test('argument convertion', () => {
    class Config {
        @f.optional()
        name?: string;

        @f.optional()
        sub?: Config;

        @f
        prio: number = 0;
    }

    class Controller {
        @f.partial(Config)
        foo(name: string): PartialField<Config> {
            return {prio: 2, 'sub.name': name};
        }

        @f
        bar(config: Config): Config {
            config.name = 'peter';
            return config;
        }
    }

    {
        const name = argumentClassToPlain(Controller, 'foo', 0, 2);
        expect(name).toBe('2');

        const res = methodResultClassToPlain(Controller, 'foo', {'sub.name': 3});
        expect(res['sub.name']).toBe('3');
    }

    {
        const config = argumentPlainToClass(Controller, 'bar', 0, {prio: '2'});
        expect(config).toBeInstanceOf(Config);
        expect(config.prio).toBe(2);

        const res = methodResultPlainToClass(Controller, 'bar', {'sub': {name: 3}});
        expect(res).toBeInstanceOf(Config);
        expect(res.sub).toBeInstanceOf(Config);
        expect(res.sub.name).toBe('3');
    }

    //todo, add validation
});

test('short @f multi gap', () => {
    class Controller {
        public foo(@f bar: string, nothing: boolean, @f foo: number) {
        }

        @f
        public undefined(bar: string, nothing: boolean) {
        }

        public onlyFirst(@f.array(String) bar: string[], nothing: boolean) {
        }
    }

    const s = getClassSchema(Controller);
    {
        const props = s.getMethodProperties('foo');

        expect(props).toBeArrayOfSize(3);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');
        expect(props[0].isArray).toBe(false);

        expect(props[1].name).toBe('1');
        expect(props[1].type).toBe('boolean');

        expect(props[2].name).toBe('2');
        expect(props[2].type).toBe('number');
        expect(props[2].isArray).toBe(false);
    }
    {
        const props = s.getMethodProperties('undefined');

        expect(props).toBeArrayOfSize(2);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');

        expect(props[1].name).toBe('1');
        expect(props[1].type).toBe('boolean');
    }
    {
        const props = s.getMethodProperties('onlyFirst');

        expect(props).toBeArrayOfSize(2);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');
        expect(props[0].isArray).toBe(true);

        expect(props[1].name).toBe('1');
        expect(props[1].type).toBe('boolean');
    }
    {
        const errors = validateMethodArgs(Controller, 'foo', []);
        expect(errors.length).toBe(3);
    }
});


test('short @f with type', () => {
    class Controller {
        public foo(@f.array(String) bar: string[]) {
        }
    }

    const s = getClassSchema(Controller);
    {
        const props = s.getMethodProperties('foo');

        expect(props).toBeArrayOfSize(1);
        expect(props[0].name).toBe('0');
        expect(props[0].type).toBe('string');
        expect(props[0].isArray).toBe(true);
    }
});


test('short @f second type fails', () => {
    expect(() => {
        class Controller {
            public foo(@f.array(String).asMap() bar: string[]) {
            }
        }
    }).toThrow('Field is already defined as array')
});

test('short @f second type fails', () => {
    expect(() => {
        class Controller {
            public foo(@f.map(String).asArray() bar: {}) {
            }
        }
    }).toThrow('Field is already defined as map')
});