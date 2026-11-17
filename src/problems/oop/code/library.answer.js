class Book {
  constructor(title, author) {
    this.title = title
    this.author = author
    this.checkedOut = false
  }
}

class Library {
  constructor() {
    this.books = new Map()
  }

  add(book) {
    this.books.set(book.title, book)
  }

  checkout(title) {
    const book = this.books.get(title)
    if (!book) throw new Error(`no book called ${title}`)
    if (book.checkedOut) throw new Error(`${title} is already checked out`)
    book.checkedOut = true
  }

  returnBook(title) {
    const book = this.books.get(title)
    if (!book || !book.checkedOut) throw new Error(`${title} isn't checked out`)
    book.checkedOut = false
  }

  available() {
    return [...this.books.values()].filter((b) => !b.checkedOut).map((b) => b.title).sort()
  }
}

const library = new Library()
library.add(new Book("Dune", "Frank Herbert"))
library.add(new Book("Emma", "Jane Austen"))
library.checkout("Dune")
console.log(library.available())
