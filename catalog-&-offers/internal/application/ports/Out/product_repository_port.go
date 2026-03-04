package out

import "petpay/catalog-offers-service/internal/application/core"

type ProductRepositoryPort interface {
	Save(product *core.Product) (*core.Product, error)
	FindAll() ([]*core.Product, error)
	FindById(id uint) (*core.Product, error)
	FindByCategory(category string) ([]*core.Product, error)
	//FindByStore(store string) ([]*core.Product, error)
	//FindByStoreAndCategory(store string, category string) ([]*core.Product, error)
	//FindByStoreAndCategoryAndName(store string, category string, name string) ([]*core.Product, error)
	//FindByStoreAndName(store string, name string) ([]*core.Product, error)
	Update(id uint, product *core.Product) (*core.Product, error)
	Delete(id uint) error
}