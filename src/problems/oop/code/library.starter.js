class Book {
  constructor(title, author) {
    this.title = title
    this.author = author
    this.checkedOut = false
  }
}

class Library {
  constructor() {
    this.books = new Map() // title -> Book
  }

  add(book) {}

  checkout(title) {
    // Throw an Error if there's no such book, or if it's already out.
  }

  returnBook(title) {
    // Throw an Error if it isn't checked out.
  }

  available() {
    // Titles that are in the library and not checked out, in A to Z order.
  }
}

const library = new Library()
library.add(new Book("Dune", "Frank Herbert"))
library.add(new Book("Emma", "Jane Austen"))
library.checkout("Dune")
console.log(library.available())
