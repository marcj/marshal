# Marshaller

[![Build Status](https://travis-ci.com/marcj/marshaller.svg?branch=master)](https://travis-ci.com/marcj/marshaller)
[![npm version](https://badge.fury.io/js/marshaller.svg)](https://badge.fury.io/js/marshaller)

Marshaller is a JSON/HTTP-Request serialiser and MongoDB entity manager
for TypeScript and has been built to make data transportation
between HTTP, Node and MongoDB super easy.

![Diagram](https://raw.github.com/marcj/marshaller/master/docs/assets/diagram.png)

## Install

```
npm install marshaller
```

## Example Entity

```typescript
import {
    ClassArray,
    ClassMap,
    DateType,
    Entity,
    ID,
    UUIDType,
    NumberType,
    EnumType,
    plainToClass,
    StringType,
    uuid,
    ArrayType,
} from 'marshaller';


@Entity('sub')
class SubModel {
    @StringType()
    label: string;
}

export enum Plan {
    DEFAULT,
    PRO,
    ENTERPRISE,
}

@Entity('SimpleModel')
class SimpleModel {
    @ID()
    @UUIDType()
    id: string = uuid();

    @StringType()
    @ArrayType()
    name: string;

    @NumberType()
    type: number = 0;

    @EnumType(Plan)
    plan: Plan = Plan.DEFAULT;

    @DateType()
    created: Date = new Date;

    @ClassArray(SubModel)
    children: SubModel[] = [];

    @ClassMap(SubModel)
    childrenMap: {[key: string]: SubModel} = {};

    constructor(name: string) {
        //constructor is supported and called as well
        this.name = name;
    }
}

const instance = plainToClass(SimpleModel, {
    name: 'myName',
    tags: ['foo', 'bar'],
    plan: 'PRO',
    created: 'Sat Oct 13 2018 14:17:35 GMT+0200',
    children: [{label: 'foo'}],
    childrenMap: {'foo': {label: 'foo'}},
});
console.log(instance);
/*
    SimpleModel {
      id: 'f2ee05ad-ca77-49ea-a571-8f0119e03038',
      name: 'myName',
      tags: ['foo', 'bar']
      type: 0,
      plan: 1,
      created: 2018-10-13T17:02:34.456Z,
      children: [ SubModel { label: 'foo' } ],
      childrenMap: { foo: SubModel { label: 'bar' } }
    }
*/
```

## Types

### ID

`@ID()` allows you to define the id of the entity. There can be only one
ID. Properties marked as ID on `_id` will receive its value after
inserting the instance in MongoDB using `Database.add()`. You need to
define either `@ObjectIdType()` or `@UUIDType` together with `@ID()`.


### ObjectIdType

`@UUIDType()` stores a ObjectID. In TypeScript and JSON it's string, and in
MongoDB we store it automatically using Mongo's `ObjectID`.
You can have multiple properties using `@ObjectIdType()`.

Data types:

| Plain  | Class  | Mongo  |
|:-------|:-------|:-------|
| string | string | ObjectID() |


### UUIDType

`@UUIDType()` stores a UUID. In TypeScript and JSON it's string, and in
MongoDB we store it automatically using Mongo's `UUID`.
You can have multiple properties using `@UUIDType()`.

Data types:

| Plain  | Class  | Mongo  |
|:-------|:-------|:-------|
| string | string | UUID() |

### StringType

`@StringType()` makes sure the property has always a string type.


Data types:

| JSON   | Class  | Mongo  |
|:-------|:-------|:-------|
| string | string | string |

### NumberType

`@NumberType()` makes sure the property has always a number type.


Data types:

| JSON   | Class  | Mongo  |
|:-------|:-------|:-------|
| number | number | number |

### DateType

`@DateType()` makes sure the property has always a date type. In JSON transport
(using classToPlain, or mongoToPlain) we use strings.

Data types:

| JSON    | Class | Mongo |
|:-------|:------|:------|
| string | Date  | Date  |


### EnumType

`@EnumType(enum)` makes sure the property has always a valid enum value. In JSON transport
(using classToPlain, or mongoToPlain) we use strings.

Data types:

| JSON   | Class | Mongo  |
|:-------|:------|:-------|
| String | Enum  | String |


### Class

`@Class(ClassDefinition)` makes sure you have in Javascript (plainToClass, or mongoToClass)
always an instance of `ClassDefinition`. In JSON and MongoDB it is stored as plain object.

Data types:

| JSON   | Class | Mongo  |
|:-------|:------|:-------|
| object | class | object |


### ClassArray

`@ClassArray(ClassDefinition)` makes sure you have in Javascript (plainToClass, or mongoToClass)
always an instance of `ClassDefinition[]`.
In JSON and MongoDB it is stored as plain array.

Data types:

| JSON  | Class | Mongo |
|:------|:------|:------|
| array | array | array |


### ClassMap

`@ClassMap(ClassDefinition)` makes sure you have in Javascript (plainToClass, or mongoToClass)
always an instance of `{[key: string]: ClassDefinition}`.
In JSON and MongoDB it is stored as plain object.

Data types:

| JSON   | Class  | Mongo  |
|:-------|:-------|:-------|
| object | object | object |


## More Decorators

### ArrayType

`@ArrayType` is used to mark the property as array of defined type.
You should use together with `@ArrayType` one data type decorator from above.

```typescript
class Model {
    @StringType()
    @ArrayType()
    names: string[]; 
}
```

### MapType

`@MapType` is used to mark the property as object / map of defined type.
You should use together with `@MapType` one data type decorator from above.

```typescript
class Model {
    @StringType()
    @MapType()
    names: {[name: string]: string}; 
}
```

### Exclude

`@Exclude()` lets you exclude properties from a class in a certain
direction. Per default it excludes to export to `*toPlain` and
`*toMongo`. You can also use `@ExcludeToMongo` or `@ExcludeToPlain` to
have more control.

```typescript
class MyEntity {
    @ID()
    @ObjectID()
    id: string;
    
    @Exclude()
    internalState: string;
}
```

### Decorator

`@Decorator` lets you transform the actual class into something
different. This is useful if you have in the actual class instance
(plainToClass or mongoToClass) a wrapper for a certain property, for
example `string[]` => `ChildrenCollection`.

```typescript
class ChildrenCollection {
    @Decorator()
    @StringType()
    @ArrayType()
    items: string[];
    
    constructor(items: string[]) {
        this.items = items;
    }
    
    public add(item: string) {
        this.items.push(item);
    }
}

class MyEntity {
    @ID()
    @ObjectID()
    id: string;
    
    //in *toMono and *toPlain is children the value of ChildrenCollection::items
    @Class(ChildrenCollection)
    children: ChildrenCollection = new ChildrenCollection([]);
}
```

`ChildrenCollection` is now always use in *toClass calls. The
constructor of ChildrenCollection receives the actual value as
first argument.

```typescript
const entity = new MyEntity();
entity.children.add('Foo');
entity.children.add('Bar');
const result = classToPlain(entity);
/*
result = {
    id: 'abcde',
    children: ['Foo', 'Bar']
}
*/
````

If you read values from mongo or plain to class (mongoToClass,
plainToClass) your decorator will be used again and receives as first
argument the actual property value:

```typescript
const entity = plainToClass({
    id: 'abcde',
    children: ['Foo', 'Bar']
});
entity.children instanceof ChildrenCollection; //true

//so you can work with it again
entity.children.add('Bar2'); 
```

## Database

Marshaller's MongoDB database abstraction makes it super easy to
retrieve and store data from and into your MongoDB. We make sure the
data from your JSON or class instance is correctly converted to MongoDB
specific types and inserted IDs are applied to your class instance.

Example:

```typescript
import {MongoClient} from "mongodb";
import {Database, plainToClass} from "marshaller";

const connection = await MongoClient.connect(
    'mongodb://localhost:27017', 
    {useNewUrlParser: true}
);
await connection.db('testing').dropDatabase();
const database = new Database(connection, 'testing');

const instance: SimpleModel = plainToClass(SimpleModel, {
    id: 'f2ee05ad-ca77-49ea-a571-8f0119e03038',
    name: 'myName',
});

await database.save(SimpleModel, instance);

const list: SimpleModel[] = await database.find(SimpleModel);
const oneItem: SimpleModel = await database.get(
    SimpleModel,
    {id: 'f2ee05ad-ca77-49ea-a571-8f0119e03038'}
    );
```


## NestJS / Express


It's super common to accept data from a frontend via HTTP, transform the
body into your class instance, work with it, and then store that data in
your MongoDB or somewhere else. With Marshaller this scenario is super
simple and you do not need any manual transformations.


```typescript
import {
    Controller, Get, Param, Post, Body
} from '@nestjs/common';

import {SimpleModel} from "./tests/entities";
import {plainToClass, Database, classToPlain} from "marshaller";
import {MongoClient} from "mongodb";

@Controller()
class MyController {
    
    private database: Database;
    
    private async getDatabase() {
        if (!this.database) {
            const connection = await MongoClient.connect(
                'mongodb://localhost:27017',
                {useNewUrlParser: true}
            );
            await connection.db('testing').dropDatabase();
            this.database = new Database(connection, 'testing');
        }
        
        return this.database;
    }
    
    @Post('/save')
    async save(
        @Body() body,
    ) {
        const instance: SimpleModel = plainToClass(SimpleModel, body);
        const versionNumber = await this.database.save(SimpleModel, instance);
        
        return instance.id;
    }
    
    @Get('/get/:id')
    async get(@Param('id') id: string) {
        const instance = await this.database.get(SimpleModel, {id: id});
        
        return classToPlain(SimpleModel, instance);
    }
}

````

