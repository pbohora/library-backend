require('dotenv').config()

const { ApolloServer, UserInputError, gql } = require('apollo-server')

const uuid = require('uuid/v1')

const mongoose = require('mongoose')
const Book = require('./models/book')
const Author = require('./models/author')

mongoose.set('useFindAndModify', false)

mongoose.set('useCreateIndex', true)

const MONGODB_URI = process.env.MONGODB_URI

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

// let authors = [
//   {
//     name: 'Robert Martin',
//     id: 'afa51ab0-344d-11e9-a414-719c6709cf3e',
//     born: 1952,
//   },
//   {
//     name: 'Martin Fowler',
//     id: 'afa5b6f0-344d-11e9-a414-719c6709cf3e',
//     born: 1963,
//   },
//   {
//     name: 'Fyodor Dostoevsky',
//     id: 'afa5b6f1-344d-11e9-a414-719c6709cf3e',
//     born: 1821,
//   },
//   {
//     name: 'Joshua Kerievsky', // birthyear not known
//     id: 'afa5b6f2-344d-11e9-a414-719c6709cf3e',
//   },
//   {
//     name: 'Sandi Metz', // birthyear not known
//     id: 'afa5b6f3-344d-11e9-a414-719c6709cf3e',
//   },
// ]

// let books = [
//   {
//     title: 'Clean Code',
//     published: 2008,
//     author: 'Robert Martin',
//     id: 'afa5b6f4-344d-11e9-a414-719c6709cf3e',
//     genres: ['refactoring'],
//   },
//   {
//     title: 'Agile software development',
//     published: 2002,
//     author: 'Robert Martin',
//     id: 'afa5b6f5-344d-11e9-a414-719c6709cf3e',
//     genres: ['agile', 'patterns', 'design'],
//   },
//   {
//     title: 'Refactoring, edition 2',
//     published: 2018,
//     author: 'Martin Fowler',
//     id: 'afa5de00-344d-11e9-a414-719c6709cf3e',
//     genres: ['refactoring'],
//   },
//   {
//     title: 'Refactoring to patterns',
//     published: 2008,
//     author: 'Joshua Kerievsky',
//     id: 'afa5de01-344d-11e9-a414-719c6709cf3e',
//     genres: ['refactoring', 'patterns'],
//   },
//   {
//     title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
//     published: 2012,
//     author: 'Sandi Metz',
//     id: 'afa5de02-344d-11e9-a414-719c6709cf3e',
//     genres: ['refactoring', 'design'],
//   },
//   {
//     title: 'Crime and punishment',
//     published: 1866,
//     author: 'Fyodor Dostoevsky',
//     id: 'afa5de03-344d-11e9-a414-719c6709cf3e',
//     genres: ['classic', 'crime'],
//   },
//   {
//     title: 'The Demon ',
//     published: 1872,
//     author: 'Fyodor Dostoevsky',
//     id: 'afa5de04-344d-11e9-a414-719c6709cf3e',
//     genres: ['classic', 'revolution'],
//   },
// ]

const typeDefs = gql`
  type Author {
    name: String!
    born: String
    bookCount: Int!
    id: ID!
  }

  type Book {
    title: String!
    published: Int!
    author: Author
    genres: [String!]
    id: ID!
  }
  type Query {
    bookCount: Int!
    allBooks(author: String, genre: String): [Book!]
    findBook(title: String!): Book

    authorCount: Int!
    allAuthors: [Author!]
    findAuthor(name: String!): Author
  }

  type Mutation {
    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]
    ): Book
    editAuthor(name: String!, setBornTo: Int!): Author
  }
`

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    allBooks: (root, args) => {
      if (args.author) {
        return books.filter((book) => book.author === args.author)
      }
      if (args.genre) {
        return books.filter((book) => book.genres.includes(args.genre))
      }
      return Book.find({}).populate('author')
    },
    findBook: (root, args) => Book.findOne({ title: args.title }),

    authorCount: () => Book.collection.countDocuments(),
    allAuthors: () => Author.find({}),
    findAuthor: (root, args) => Author.findOne({ name: args.name }),
  },
  Author: {
    bookCount: async (root) => {
      const books = await Book.find({}).populate('author')
      console.log(books)
      const count = books.reduce(function (n, val) {
        return n + (val.author.name === root.name)
      }, 0)
      return count
    },
  },

  Mutation: {
    addBook: async (root, args) => {
      const book = new Book({ ...args })
      // console.log(book.author)

      const authorInDb = await Author.findOne({ name: args.author })
      console.log('fsddfdf', authorInDb)

      try {
        if (authorInDb !== null) {
          book.author = authorInDb
          return await book.save()
        }
        const author = new Author({ name: args.author })
        const savedAuthor = await author.save()

        book.author = savedAuthor
        await book.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      // const book = { ...args, id: uuid() }
      // books = books.concat(book)

      return book
    },

    editAuthor: async (root, args) => {
      const author = await Author.findOne({ name: args.name })
      if (!author) {
        return null
      }

      author.born = args.setBornTo

      try {
        await author.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      return author
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
