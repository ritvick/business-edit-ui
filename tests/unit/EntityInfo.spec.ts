import Vue from 'vue'
import Vuetify from 'vuetify'
import { getVuexStore } from '@/store/'
import { createLocalVue, mount } from '@vue/test-utils'
import EntityInfo from '@/components/common/EntityInfo.vue'
import mockRouter from './MockRouter'
import VueRouter from 'vue-router'

Vue.use(Vuetify)

const vuetify = new Vuetify({})
const store = getVuexStore()
let state = store.state.stateModel
document.body.setAttribute('data-app', 'true')

describe('Entity Info component in a Correction as a named company', () => {
  let wrapper: any

  const mockFiling = {
    header: {
      name: 'incorporationApplication',
      filingId: 12345
    },
    business: {
      identifier: 'BC1234567',
      legalType: 'BEN',
      taxId: '123456789' // sample BN9
    },
    incorporationApplication: {
      contactPoint: {
        email: 'mock@example.com',
        phone: '123-456-7890'
      },
      nameRequest: {
        legalType: 'BEN',
        nrNumber: 'NR 1234567',
        legalName: 'My Mock Name Inc.'
      },
      offices: {},
      parties: [],
      shareClasses: []
    }
  }

  beforeAll(() => {
    state.tombstone.keycloakRoles = ['staff']
    state.businessInformation = mockFiling.business
    state.tombstone.businessId = mockFiling.business.identifier
    state.businessContact = mockFiling.incorporationApplication.contactPoint
    store.state.stateModel.entitySnapshot = {
      businessInfo: {
        legalName: 'My Mock Name Inc.'
      }
    }
  })

  beforeEach(async () => {
    const localVue = createLocalVue()
    localVue.use(VueRouter)
    const router = mockRouter.mock()
    await router.push({ name: 'correction' })

    wrapper = mount(EntityInfo, {
      localVue,
      vuetify,
      store,
      router
    })
  })

  afterEach(() => {
    wrapper.destroy()
  })

  it('renders the EntityInfo Component', () => {
    expect(wrapper.findComponent(EntityInfo).exists()).toBe(true)
  })

  it('renders the business name and numbers', () => {
    expect(wrapper.find('#entity-legal-name').text()).toBe('My Mock Name Inc.')
    expect(wrapper.find('#entity-business-number').text()).toBe('123456789')
    expect(wrapper.find('#entity-incorp-number').text()).toBe('BC1234567')
  })

  it('renders the business contact information', () => {
    expect(wrapper.find('#entity-business-email').text()).toBe('mock@example.com')
    expect(wrapper.find('#entity-business-phone').text()).toBe('123-456-7890')
  })
})

describe('Entity Info component in a Correction as a numbered company', () => {
  let wrapper: any

  const mockFiling = {
    header: {
      name: 'incorporationApplication',
      filingId: 12345
    },
    business: {
      identifier: 'BC1234567',
      legalType: 'BEN',
      taxId: '123456789BC0001' // sample BN15
    },
    incorporationApplication: {
      contactPoint: {
        email: 'mock@example.com',
        phone: '321-456-7890'
      },
      nameRequest: {},
      offices: {},
      parties: [],
      shareClasses: []
    }
  }

  beforeAll(() => {
    state.tombstone.keycloakRoles = ['staff']
    state.businessInformation = mockFiling.business
    state.tombstone.businessId = mockFiling.business.identifier
    state.businessContact = mockFiling.incorporationApplication.contactPoint
    store.state.stateModel.entitySnapshot = {
      businessInfo: {
        legalName: null
      }
    }
  })

  beforeEach(async () => {
    const localVue = createLocalVue()
    localVue.use(VueRouter)
    const router = mockRouter.mock()
    await router.push({ name: 'correction' })

    wrapper = mount(EntityInfo, {
      localVue,
      vuetify,
      store,
      router
    })
  })

  afterEach(() => {
    wrapper.destroy()
  })

  it('renders the EntityInfo Component', () => {
    expect(wrapper.findComponent(EntityInfo).exists()).toBe(true)
  })

  it('renders the business name and numbers', () => {
    expect(wrapper.find('#entity-legal-name').text()).toBe('Numbered Benefit Company')
    expect(wrapper.find('#entity-business-number').text()).toBe('123456789BC0001')
    expect(wrapper.find('#entity-incorp-number').text()).toBe('BC1234567')
  })

  it('renders the business contact information', () => {
    expect(wrapper.find('#entity-business-email').text()).toBe('mock@example.com')
    expect(wrapper.find('#entity-business-phone').text()).toBe('321-456-7890')
  })
})
