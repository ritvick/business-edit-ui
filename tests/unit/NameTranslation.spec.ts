import Vue from 'vue'
import Vuetify from 'vuetify'
import VueRouter from 'vue-router'
import mockRouter from './MockRouter'
import { getVuexStore } from '@/store/'
import { createLocalVue, mount } from '@vue/test-utils'
import NameTranslation from '@/components/common/YourCompany/NameTranslations/NameTranslation.vue'

Vue.use(Vuetify)

const vuetify = new Vuetify({})
const store = getVuexStore()

function resetStore (): void {
  store.state.stateModel.nameTranslations = []
}

// Local references
const nameTranslationsList = [
  { name: 'First mock name translation ltd.' },
  { name: 'Second mock name translation inc' },
  { name: 'Third mock name translation ltd.' },
  { name: 'Quatrième nom simulé' }
]

const nameTranslationsListChanged = [
  { name: 'First mock name translation ltd.', action: 'edited' },
  { name: 'Second mock name translation inc' },
  { name: 'Third mock name translation ltd.' },
  { name: 'Quatrième nom simulé' }
]

describe('Name Translation component', () => {
  let wrapperFactory: any

  beforeEach(() => {
    const localVue = createLocalVue()
    localVue.use(VueRouter)
    const router = mockRouter.mock()

    wrapperFactory = async (propsData: any) => {
      const wrapper = mount(NameTranslation, {
        localVue,
        router,
        store,
        vuetify,
        propsData: { ...propsData }
      })
      await Vue.nextTick()
      return wrapper
    }
  })

  it('displays the list of name translations and action btns', async () => {
    store.state.stateModel.nameTranslations = nameTranslationsListChanged
    const wrapper = await wrapperFactory({ isSummaryMode: true })

    // Verify list exists
    expect(wrapper.find('#name-translation').exists()).toBeTruthy()

    // Verify list items
    const namesList = wrapper.vm.$el.querySelectorAll('.info-text')
    expect(namesList[0].textContent).toContain(nameTranslationsList[0].name)
    expect(namesList[1].textContent).toContain(nameTranslationsList[1].name)
    expect(namesList[2].textContent).toContain(nameTranslationsList[2].name)
    expect(namesList[3].textContent).toContain(nameTranslationsList[3].name)

    wrapper.destroy()
  })

  it('does not display translations if unchanged', async () => {
    store.state.stateModel.nameTranslations = nameTranslationsList
    const wrapper = await wrapperFactory({ isSummaryMode: true })

    // Verify list exists
    expect(wrapper.find('#name-translation').exists()).toBeFalsy()

    wrapper.destroy()
  })
})
