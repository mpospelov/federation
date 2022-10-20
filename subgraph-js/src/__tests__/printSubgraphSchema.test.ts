import { fixtures } from 'apollo-federation-integration-testsuite';
import { buildSubgraphSchema } from '../buildSubgraphSchema';
import { printSubgraphSchema } from '../printSubgraphSchema';
import gql from 'graphql-tag';
import './matchers';

describe('printSubgraphSchema', () => {
  it('prints a subgraph correctly', () => {
    const schema = buildSubgraphSchema(fixtures[0].typeDefs);
    expect(printSubgraphSchema(schema)).toMatchString(`
      schema {
        query: RootQuery
        mutation: Mutation
      }

      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.1", import: ["@key", "@requires", "@provides", "@external", "@tag", "@extends", "@shareable", "@inaccessible", "@override", "@composeDirective"])

      directive @stream on FIELD

      directive @transform(from: String!) on FIELD

      directive @cacheControl(maxAge: Int, scope: CacheControlScope, inheritMaxAge: Boolean) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

      enum CacheControlScope
        @tag(name: "from-reviews")
      {
        PUBLIC @tag(name: "from-reviews")
        PRIVATE
      }

      scalar JSON
        @tag(name: "from-reviews")
        @specifiedBy(url: "https://json-spec.dev")

      type RootQuery {
        user(id: ID!): User
        me: User @cacheControl(maxAge: 1000, scope: PRIVATE)
      }

      type PasswordAccount
        @key(fields: "email")
      {
        email: String!
      }

      type SMSAccount
        @key(fields: "number")
      {
        number: String
      }

      union AccountType
        @tag(name: "from-accounts")
       = PasswordAccount | SMSAccount

      type UserMetadata {
        name: String
        address: String
        description: String
      }

      type User
        @key(fields: "id")
        @key(fields: "username name { first last }")
        @tag(name: "from-accounts")
      {
        id: ID! @tag(name: "accounts")
        name: Name @cacheControl(inheritMaxAge: true)
        username: String @shareable
        birthDate(locale: String @tag(name: "admin")): String @tag(name: "admin") @tag(name: "dev")
        account: AccountType
        metadata: [UserMetadata]
        ssn: String
      }

      type Name {
        first: String
        last: String
      }

      type Mutation {
        login(username: String!, password: String!, userId: String @deprecated(reason: "Use username instead")): User
      }

      type Library
        @key(fields: "id")
      {
        id: ID!
        name: String @external
        userAccount(id: ID! = 1): User @requires(fields: "name")
        description: String @override(from: "books")
      }
    `);
  });

  it('prints a scalar without a directive correctly', () => {
    const schema = gql`
      scalar JSON
    `;
    const subgraphSchema = buildSubgraphSchema(schema);

    expect(printSubgraphSchema(subgraphSchema)).toMatchString(`
      scalar JSON
    `);
  });

  fit('prints reviews subgraph correctly', () => {
    const schema = buildSubgraphSchema(fixtures[5].typeDefs);
    expect(printSubgraphSchema(schema)).toMatchInlineSnapshot(`
      "extend schema
        @link(url: \\"https://specs.apollo.dev/federation/v2.1\\", import: [\\"@key\\", \\"@requires\\", \\"@provides\\", \\"@external\\", \\"@tag\\", \\"@extends\\", \\"@shareable\\", \\"@inaccessible\\", \\"@override\\", \\"@composeDirective\\"])

      directive @stream on FIELD

      directive @transform(from: String!) on FIELD

      type Query {
        topReviews(first: Int = 5): [Review]
      }

      union ReviewSubject = Book | Van | Image

      interface ReviewSubjectInterface {
        subjectInterfaceId: ID!
      }

      type Review
        @key(fields: \\"id\\")
      {
        id: ID!
        body(format: Boolean = false): String
        author: User @provides(fields: \\"username\\")
        product: Product
        subject: ReviewSubject
        subjectInterface: ReviewSubjectInterface
        metadata: [MetadataOrError]
      }

      input UpdateReviewInput
        @tag(name: \\"from-reviews\\")
      {
        id: ID!
        body: String @tag(name: \\"from-reviews\\")
      }

      type UserMetadata {
        address: String @external
      }

      type User
        @key(fields: \\"id\\")
        @tag(name: \\"from-reviews\\")
      {
        id: ID!
        username: String @external
        reviews: [Review]
        numberOfReviews: Int!
        metadata: [UserMetadata] @external
        goodAddress: Boolean @requires(fields: \\"metadata { address }\\")
      }

      interface Product
        @tag(name: \\"from-reviews\\")
      {
        reviews: [Review] @tag(name: \\"from-reviews\\")
      }

      interface WebResource {
        resourceUrl: String
      }

      type Image implements ReviewSubjectInterface
        @key(fields: \\"name\\")
      {
        name: String!
        subjectInterfaceId: ID! @external
      }

      type Furniture implements Product & WebResource
        @key(fields: \\"upc\\")
      {
        upc: String!
        reviews: [Review]
        resourceUrl: String
      }

      type Book implements Product & WebResource & ReviewSubjectInterface
        @key(fields: \\"isbn\\")
      {
        subjectInterfaceId: ID!
        isbn: String!
        reviews: [Review]
        similarBooks: [Book]! @external
        relatedReviews: [Review!]! @requires(fields: \\"similarBooks { isbn }\\")
        resourceUrl: String
      }

      interface Vehicle {
        retailPrice: String
      }

      type Car implements Vehicle & WebResource
        @key(fields: \\"id\\")
      {
        id: String!
        price: String @external
        retailPrice: String @requires(fields: \\"price\\")
        resourceUrl: String
      }

      type Van implements Vehicle & WebResource & ReviewSubjectInterface
        @key(fields: \\"id\\")
      {
        subjectInterfaceId: ID!
        id: String!
        price: String @external
        retailPrice: String @requires(fields: \\"price\\")
        resourceUrl: String
      }

      input ReviewProduct {
        upc: String!
        body: String!
        stars: Int @deprecated(reason: \\"Stars are no longer in use\\")
      }

      type Mutation {
        reviewProduct(input: ReviewProduct!): Product
        updateReview(review: UpdateReviewInput! @tag(name: \\"from-reviews\\")): Review
        deleteReview(id: ID!): Boolean
      }

      type KeyValue
        @shareable
        @tag(name: \\"from-reviews\\")
      {
        key: String! @tag(name: \\"from-reviews\\")
        value: String!
      }

      type Error
        @shareable
      {
        code: Int
        message: String
      }

      union MetadataOrError = KeyValue | Error"
    `);
  });

  it('outputs can be read by buildSchema', () => {
    const schema = `
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

      type Query {
        t: T
      }

      type T
        @key(fields: "id")
      {
        id: ID!
        x: Int @shareable
      }
    `;

    const printed = printSubgraphSchema(buildSubgraphSchema(gql(schema)));
    expect(printed).toMatchString(schema);
  });
});
