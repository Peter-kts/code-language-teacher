class Book:
    def __init__(self, title, author):
        self.title = title
        self.author = author
        self.checked_out = False


class Library:
    def __init__(self):
        self.books = {}

    def add(self, book):
        self.books[book.title] = book

    def checkout(self, title):
        if title not in self.books:
            raise KeyError(f"no book called {title}")
        book = self.books[title]
        if book.checked_out:
            raise ValueError(f"{title} is already checked out")
        book.checked_out = True

    def return_book(self, title):
        book = self.books.get(title)
        if book is None or not book.checked_out:
            raise ValueError(f"{title} isn't checked out")
        book.checked_out = False

    def available(self):
        return sorted(t for t, b in self.books.items() if not b.checked_out)


library = Library()
library.add(Book("Dune", "Frank Herbert"))
library.add(Book("Emma", "Jane Austen"))
library.checkout("Dune")
print(library.available())
