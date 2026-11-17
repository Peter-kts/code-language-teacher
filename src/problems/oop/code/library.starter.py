class Book:
    def __init__(self, title, author):
        self.title = title
        self.author = author
        self.checked_out = False


class Library:
    def __init__(self):
        self.books = {}  # title -> Book

    def add(self, book):
        pass

    def checkout(self, title):
        # Raise a KeyError if there's no such book, a ValueError if it's already out.
        pass

    def return_book(self, title):
        # Raise a ValueError if it isn't checked out.
        pass

    def available(self):
        # Titles that are in the library and not checked out, in A to Z order.
        pass


library = Library()
library.add(Book("Dune", "Frank Herbert"))
library.add(Book("Emma", "Jane Austen"))
library.checkout("Dune")
print(library.available())
